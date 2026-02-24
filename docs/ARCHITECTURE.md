# FortniteOptimizer 2026 — Licensing System Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                               │
│                                                                     │
│  ┌──────────┐    HTTPS/TLS    ┌──────────────┐    ┌─────────────┐  │
│  │  Client   │◄──────────────►│   API Gateway │    │  Dashboard  │  │
│  │  C++ Win  │                │   (NestJS)    │◄───│  Admin React│  │
│  └──────────┘                 └──────┬───────┘    └─────────────┘  │
│       │                              │                              │
│       │ HWID+Key                     │                              │
│       │                     ┌────────┴────────┐                     │
│       │                     │                 │                     │
│       │              ┌──────▼──────┐  ┌───────▼──────┐             │
│       │              │ PostgreSQL  │  │    Redis      │             │
│       │              │ (Data)      │  │ (Cache/Rate)  │             │
│       │              └─────────────┘  └──────────────┘             │
│       │                                                             │
│       │              ┌─────────────┐                                │
│       └─────────────►│   Stripe    │ (Webhooks)                     │
│                      └─────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Flux d'activation complet

```
CLIENT                          API                         DATABASE
  │                              │                              │
  │  1. POST /auth/activate      │                              │
  │  {key, hwid, machine_info}   │                              │
  │─────────────────────────────►│                              │
  │                              │  2. Validate key format      │
  │                              │  3. Check rate limit (Redis) │
  │                              │  4. Query license            │
  │                              │─────────────────────────────►│
  │                              │◄─────────────────────────────│
  │                              │  5. Verify:                  │
  │                              │     - key exists?            │
  │                              │     - not expired?           │
  │                              │     - not banned?            │
  │                              │  6. Check HWID:              │
  │                              │     - first activation?      │
  │                              │       → bind HWID            │
  │                              │     - same HWID?             │
  │                              │       → allow                │
  │                              │     - different HWID?        │
  │                              │       → reject               │
  │                              │  7. Generate JWT + refresh   │
  │                              │  8. Log activation           │
  │                              │─────────────────────────────►│
  │  9. Return:                  │◄─────────────────────────────│
  │  {access_token, refresh,     │                              │
  │   expires_at, offline_token} │                              │
  │◄─────────────────────────────│                              │
  │                              │                              │
  │  10. Store tokens locally    │                              │
  │  11. Start heartbeat timer   │                              │
  │                              │                              │
  │  [Every 5 min]               │                              │
  │  POST /auth/heartbeat        │                              │
  │  {access_token}              │                              │
  │─────────────────────────────►│  12. Verify JWT              │
  │                              │  13. Check ban status        │
  │  {status: "ok"}              │  14. Update last_seen        │
  │◄─────────────────────────────│                              │
```

## Schéma de base de données

```sql
── admins ──────────────────────────────
 id            UUID        PK
 username      VARCHAR(50) UNIQUE NOT NULL
 password_hash VARCHAR(255) NOT NULL
 role          ENUM('superadmin','admin','viewer')
 created_at    TIMESTAMP
 last_login    TIMESTAMP

── licenses ────────────────────────────
 id            UUID        PK
 license_key   VARCHAR(29) UNIQUE NOT NULL  -- XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
 plan          ENUM('30d','90d','365d','lifetime')
 status        ENUM('active','expired','banned','suspended')
 hwid          VARCHAR(64) NULL             -- SHA256, lié à l'activation
 hwid_bound_at TIMESTAMP   NULL
 email         VARCHAR(255) NULL
 stripe_sub_id VARCHAR(255) NULL
 created_at    TIMESTAMP
 expires_at    TIMESTAMP   NULL             -- NULL = lifetime
 banned_at     TIMESTAMP   NULL
 ban_reason    TEXT        NULL
 last_heartbeat TIMESTAMP  NULL
 activation_count INT      DEFAULT 0
 max_activations  INT      DEFAULT 1
 metadata      JSONB       NULL

── activations ─────────────────────────
 id            UUID        PK
 license_id    UUID        FK → licenses.id
 hwid          VARCHAR(64) NOT NULL
 ip_address    INET        NOT NULL
 machine_info  JSONB       NULL             -- {os, cpu, hostname}
 status        ENUM('success','hwid_mismatch','expired','banned','invalid')
 created_at    TIMESTAMP

── activation_logs ─────────────────────
 id            UUID        PK
 license_id    UUID        FK → licenses.id NULL
 action        VARCHAR(50) NOT NULL         -- activate, heartbeat, ban, reset_hwid...
 ip_address    INET
 details       JSONB       NULL
 created_at    TIMESTAMP

── refresh_tokens ──────────────────────
 id            UUID        PK
 license_id    UUID        FK → licenses.id
 token_hash    VARCHAR(64) NOT NULL         -- SHA256 du refresh token
 expires_at    TIMESTAMP   NOT NULL
 revoked       BOOLEAN     DEFAULT FALSE
 created_at    TIMESTAMP
```

## Sécurité — Couches de protection

### Client → API
1. **HTTPS obligatoire** (TLS 1.3)
2. **HWID hashé côté client** (SHA256)
3. **Anti-replay** : nonce + timestamp dans chaque requête
4. **Certificate pinning** (optionnel, recommandé)
5. **User-Agent personnalisé** vérifié côté serveur

### API
1. **Rate limiting** : 5 req/min par IP pour activation, 60 req/min pour heartbeat
2. **JWT courte durée** : access_token = 15 min, refresh = 7 jours
3. **Brute force protection** : blocage IP après 10 échecs en 10 min
4. **Input validation** : Pipes NestJS + class-validator
5. **Helmet** : headers de sécurité HTTP
6. **CORS** : restreint au dashboard uniquement

### Données
1. **Passwords** : bcrypt (rounds=12)
2. **HWID** : salé côté serveur (HMAC-SHA256)
3. **License keys** : générées avec crypto.randomBytes
4. **Refresh tokens** : stockés hashés (SHA256)
5. **Logs** : IP + action + timestamp pour audit

## Structure du projet

```
licensing-system/
├── docker-compose.yml
├── .env.example
│
├── backend/                    # API NestJS
│   ├── prisma/
│   │   └── schema.prisma       # Schéma BDD
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── configuration.ts
│   │   ├── common/
│   │   │   ├── guards/         # JwtGuard, AdminGuard, RateLimitGuard
│   │   │   ├── interceptors/   # LoggingInterceptor, TransformInterceptor
│   │   │   ├── filters/        # GlobalExceptionFilter
│   │   │   ├── decorators/     # @CurrentLicense, @AdminOnly
│   │   │   ├── pipes/          # ValidationPipe custom
│   │   │   └── utils/          # crypto, hwid-utils, key-generator
│   │   ├── modules/
│   │   │   ├── auth/           # Activation, heartbeat, refresh
│   │   │   ├── license/        # CRUD licences
│   │   │   ├── hwid/           # Gestion HWID, binding
│   │   │   ├── payment/        # Stripe webhooks
│   │   │   ├── admin/          # Dashboard API
│   │   │   └── health/         # Health check
│   │   └── database/
│   │       └── prisma.service.ts
│   ├── test/
│   ├── Dockerfile
│   └── package.json
│
├── dashboard/                  # Admin React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   ├── Dockerfile
│   └── package.json
│
├── client-cpp/                 # Client Windows C++
│   ├── src/
│   │   ├── main.cpp
│   │   ├── licensing.cpp
│   │   ├── hwid.cpp
│   │   ├── http_client.cpp
│   │   ├── crypto_utils.cpp
│   │   └── anti_debug.cpp
│   ├── include/
│   │   ├── licensing.h
│   │   ├── hwid.h
│   │   ├── http_client.h
│   │   ├── crypto_utils.h
│   │   └── anti_debug.h
│   └── CMakeLists.txt
│
├── scripts/
│   ├── generate-keys.ts        # Script admin pour générer des clés
│   └── seed-admin.ts           # Créer le premier admin
│
└── docs/
    └── ARCHITECTURE.md
```

## Conseils anti-crack

### Niveau 1 — Basique (implémenté)
- Vérification HWID à chaque lancement
- Heartbeat périodique (kill switch distant)
- Anti-debug (IsDebuggerPresent, CheckRemoteDebugger)
- Strings chiffrées (XOR simple pour les URLs API)

### Niveau 2 — Intermédiaire (recommandé)
- VMProtect ou Themida pour l'obfuscation binaire
- Integrity check du .exe (hash au lancement)
- Certificate pinning HTTPS
- Détection de hooks (inline patching)

### Niveau 3 — Avancé (optionnel)
- Driver kernel anti-tamper (nécessite signature EV)
- Chiffrement de sections mémoire à runtime
- Polymorphisme des checks de licence
- Vérification serveur du hash du binaire client
