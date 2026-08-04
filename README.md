# FortniteOptimizer 2026 — Système de Licence Sécurisé

## Architecture

```
licensing-system/
├── backend/          ← API NestJS (TypeScript)
│   ├── prisma/       ← Schéma BDD PostgreSQL
│   └── src/
│       ├── modules/
│       │   ├── auth/      ← Activation, Heartbeat, Refresh
│       │   ├── license/   ← CRUD licences, expiration auto
│       │   ├── admin/     ← Dashboard API
│       │   ├── payment/   ← Stripe webhooks
│       │   └── health/    ← Health check
│       ├── common/
│       │   ├── guards/    ← JWT auth, Rate limiting
│       │   ├── filters/   ← Exception handling global
│       │   ├── interceptors/ ← Logging HTTP
│       │   └── utils/     ← Crypto (SHA256, HMAC, key generation)
│       └── database/      ← Prisma + Redis services
│
├── client-cpp/       ← Client Windows C++
│   ├── include/      ← Headers
│   │   ├── licensing.h    ← Client de licence
│   │   ├── hwid.h         ← Génération HWID
│   │   ├── http_client.h  ← Client HTTPS (WinHTTP)
│   │   ├── crypto_utils.h ← SHA256, XOR, Nonce
│   │   └── anti_debug.h   ← Anti-debugging
│   ├── src/          ← Implémentations
│   └── CMakeLists.txt
│
├── dashboard/        ← Admin React + Tailwind
│   └── src/
│       ├── App.jsx        ← App complète (Login, Dashboard, CRUD)
│       └── lib/api.js     ← Client API
│
├── scripts/          ← Utilitaires admin
├── docker-compose.yml
├── .env.example
└── docs/ARCHITECTURE.md   ← Diagrammes et schéma BDD
```

## Démarrage Rapide

### 1. Prérequis
- Docker + Docker Compose
- Node.js 20+ (pour le développement)
- Visual Studio 2022 ou MinGW (pour le client C++)

### 2. Configuration

```bash
cp .env.example .env

# Générer les secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('HWID_SALT=' + require('crypto').randomBytes(32).toString('hex'))"

# Éditer .env avec les valeurs générées
```

### 3. Lancement (Docker)

```bash
docker compose up -d
```

Cela démarre PostgreSQL, Redis, l'API et le Dashboard.

### 4. Initialisation

```bash
# Créer le premier admin
cd backend
npm install
npx prisma migrate dev
npx ts-node ../scripts/seed-admin.ts admin MonMotDePasse!

# Générer des clés de test
npx ts-node ../scripts/generate-keys.ts DAYS_30 5
```

### 5. Accès
- **API**: http://localhost:3000/api/v1/health
- **Dashboard**: http://localhost:5173
- **Swagger** (dev): http://localhost:3000/docs

## Développement Local (sans Docker)

```bash
# Terminal 1 — Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Terminal 2 — Dashboard
cd dashboard
npm install
npm run dev
```

## Client C++ — Compilation

### MSVC (Visual Studio 2022)
```bash
cd client-cpp
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --config Release
# → build/Release/FortniteOptimizer2026.exe
```

### MinGW
```bash
cd client-cpp
cmake -B build -G "MinGW Makefiles"
cmake --build build
```

### Intégration dans FortniteOptimizer existant
```cpp
#include "licensing.h"

int main() {
    licensing::LicenseClient client("https://api.yourdomain.com");

    // Activation
    auto info = client.activate("XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    if (info.status != licensing::Status::VALID) {
        // Afficher erreur et quitter
        return 1;
    }

    // Démarrer heartbeat en arrière-plan (toutes les 5 min)
    client.startHeartbeatLoop(300);

    // ... code de l'optimiseur ...

    // Vérification périodique dans la boucle principale
    if (!client.isValid()) {
        // Licence révoquée pendant la session
    }
}
```

## API Endpoints

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/v1/auth/activate` | Activation licence + HWID | Non |
| POST | `/api/v1/auth/heartbeat` | Heartbeat périodique | JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token | Non |
| POST | `/api/v1/admin/login` | Login admin | Non |
| GET | `/api/v1/admin/licenses` | Lister licences | Admin |
| POST | `/api/v1/admin/licenses` | Créer licence | Admin |
| POST | `/api/v1/admin/licenses/batch` | Générer lot de clés | Admin |
| GET | `/api/v1/admin/licenses/:id` | Détail licence | Admin |
| PUT | `/api/v1/admin/licenses/:id/ban` | Bannir licence | Admin |
| PUT | `/api/v1/admin/licenses/:id/unban` | Débannir | Admin |
| PUT | `/api/v1/admin/licenses/:id/reset-hwid` | Reset HWID | Admin |
| PUT | `/api/v1/admin/licenses/:id/extend` | Étendre durée | Admin |
| DELETE | `/api/v1/admin/licenses/:id` | Supprimer | Admin |
| GET | `/api/v1/admin/stats` | Statistiques | Admin |
| GET | `/api/v1/admin/logs` | Logs activation | Admin |
| POST | `/api/v1/payment/webhook/stripe` | Webhook Stripe | Signature |
| GET | `/api/v1/health` | Health check | Non |

## Sécurité Implémentée

| Couche | Protection |
|--------|-----------|
| Transport | HTTPS / TLS 1.3, Helmet headers |
| Auth | JWT 15min + Refresh 7j, bcrypt(12) admin |
| HWID | SHA256 client → HMAC-SHA256 serveur (salé) |
| Anti-replay | Nonce unique + timestamp (60s window) |
| Rate limit | Redis sliding window par IP |
| Brute force | Blocage IP après 10 échecs (10min) |
| Client | Anti-debug (5 checks), XOR token storage |
| Données | Refresh tokens hashés (SHA256), pas de clé en clair |

## Stripe — Configuration

1. Créer produits dans Stripe Dashboard avec metadata `plan: DAYS_30`
2. Configurer le webhook vers `https://api.yourdomain.com/api/v1/payment/webhook/stripe`
3. Événements à écouter : `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Ajouter `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans `.env`

## Production — Checklist

- [ ] Générer tous les secrets (.env)
- [ ] Générer une clé dédiée `OFFLINE_TOKEN_SECRET`
- [ ] Configurer HTTPS (reverse proxy nginx/Caddy)
- [ ] Laisser PostgreSQL, Redis, API et dashboards bindés sur `127.0.0.1` puis publier uniquement via le reverse proxy
- [ ] Configurer CORS (ADMIN_CORS_ORIGIN)
- [ ] Activer `TRUST_PROXY=true` derrière nginx/Caddy/Cloudflare
- [ ] Configurer backup PostgreSQL
- [ ] Changer le mot de passe admin
- [ ] Configurer Stripe en mode live
- [ ] Obfusquer le binaire C++ (VMProtect/Themida recommandé)
- [ ] Chiffrer l'URL API dans le client (utiliser crypto::deobfuscate)
- [ ] Activer certificate pinning dans le client HTTP
- [ ] Configurer monitoring (health endpoint)
