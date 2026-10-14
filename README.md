# FortniteOpti

Application de vente et de gestion de licences et produits numériques FortniteOpti. Le dépôt regroupe l’API, le tableau de bord d’administration, le site client, le bot Discord et le client Windows C++.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Configuration](#configuration)
- [Démarrage avec Docker](#démarrage-avec-docker)
- [Développement local](#développement-local)
- [Produits et stock du Temp Spoofer](#produits-et-stock-du-temp-spoofer)
- [Paiements et livraison](#paiements-et-livraison)
- [Tests et maintenance](#tests-et-maintenance)
- [Déploiement et sécurité](#déploiement-et-sécurité)
- [Documentation complémentaire](#documentation-complémentaire)

## Fonctionnalités

- Boutique publique avec catalogue, pages produit, commandes et paiement.
- Comptes clients, profil et accès aux licences et téléchargements associés aux achats.
- Tableau de bord d’administration pour les produits, commandes, clients et paramètres de la boutique.
- Inventaire de clés fournisseur du Temp Spoofer, suivi des réservations et des livraisons par offre.
- Paiements Stripe et paiements crypto via les intégrations configurées dans le backend.
- API NestJS, base PostgreSQL et Redis.
- Bot Discord séparé pour les commandes, la modération, les tickets et les intégrations backend.
- Client Windows C++ et modules liés aux licences.

## Architecture

| Dossier | Rôle |
| --- | --- |
| `backend/` | API NestJS, logique métier, paiements, authentification, shop, clients et accès aux données Prisma. |
| `backend/prisma/` | Schéma et migrations PostgreSQL. |
| `dashboard/` | Interface React d’administration. |
| `storefront/` | Site React public et espace client. |
| `discord-bot/` | Bot Discord Node.js et intégration backend. |
| `client-cpp/` | Client Windows C++ et composants de licence. |
| `docs/` | Guides d’architecture, de durcissement et du Temp Spoofer. |
| `scripts/` | Outils d’administration et de génération de clés. |
| `docker-compose.yml` | PostgreSQL, Redis, backend, dashboard et storefront. |

## Prérequis

- Node.js 20 ou supérieur et npm.
- Docker Engine et Docker Compose pour le lancement conteneurisé.
- PostgreSQL 16 et Redis 7 si les services sont lancés séparément.
- Visual Studio 2022 avec C++ ou un compilateur compatible CMake pour compiler `client-cpp/`.
- Comptes et secrets du fournisseur de paiement si les paiements correspondants doivent être activés.

## Configuration

Ne commitez jamais de secrets, de clés fournisseur ou de fichiers `.env`. Les fichiers `.env.example` sont des modèles :

- `backend/.env.example` : configuration backend, base de données, Redis, secrets JWT, paiements, CORS et SMTP.
- `dashboard/.env.example` : URL publique de l’API utilisée à la compilation.
- `storefront/.env.example` : URL de l’API et URL de téléchargement générale éventuelle.
- `discord-bot/.env.example` : token Discord, rôles, salons et secret d’intégration backend.

Générez des secrets aléatoires distincts pour `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OFFLINE_TOKEN_SECRET`, `HWID_SALT` et `BOT_API_SECRET`. Exemple pour une valeur :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Pour Docker Compose, créez un fichier `.env` à la racine, à partir de `backend/.env.example`, puis adaptez les valeurs utilisées par `docker-compose.yml`. Les variables de base de données, Redis et les secrets de paiement doivent correspondre à votre environnement. Compose expose les ports sur `127.0.0.1` par défaut ; utilisez un reverse proxy HTTPS pour les rendre accessibles publiquement.

Pour un lancement local sans Docker, créez `backend/.env` à partir de `backend/.env.example` et configurez `DATABASE_URL` et `REDIS_URL` pour vos services locaux. Les deux interfaces acceptent `VITE_API_URL`. Ces variables `VITE_*` sont intégrées lors du build, elles ne sont pas des secrets.

## Démarrage avec Docker

Depuis la racine du dépôt, après avoir créé et rempli `.env` :

```bash
docker compose up -d --build
```

Le compose lance PostgreSQL, Redis, l’API, le dashboard et le storefront. Consultez les journaux avec :

```bash
docker compose logs -f backend
docker compose logs -f dashboard storefront
```

L’API est publiée localement sur `http://127.0.0.1:3000`, le dashboard sur `http://127.0.0.1:5173` et le storefront sur `http://127.0.0.1:3002`. L’endpoint de santé est `http://127.0.0.1:3000/api/v1/health`. Configurez `API_URL` dans l’environnement Compose pour l’URL d’API intégrée aux deux interfaces lors du build.

Les migrations Prisma doivent être appliquées au déploiement. Pour une base déjà configurée, depuis `backend/` :

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

Pour créer ou gérer le compte administrateur, utilisez la procédure prévue par le projet et ses outils dans `scripts/` et `backend/scripts/`. N’utilisez pas de mot de passe d’exemple en production.

## Développement local

Lancez d’abord PostgreSQL et Redis, puis configurez `backend/.env`. Dans des terminaux séparés :

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

```bash
cd dashboard
npm ci
npm run dev
```

```bash
cd storefront
npm ci
npm run dev
```

Par défaut, Vite démarre le storefront sur le port `3002`. Le dashboard utilise le port Vite par défaut. Ajustez `VITE_API_URL` dans les fichiers `.env` locaux si l’API n’est pas sur `http://localhost:3000`.

### Bot Discord

Le bot est optionnel et se configure indépendamment :

```bash
cd discord-bot
npm ci
cp .env.example .env
npm run dev
```

Renseignez les IDs Discord et le token dans `discord-bot/.env`, ainsi que `API_BASE_URL` et le même `BOT_API_SECRET` que le backend. La commande `npm run deploy` enregistre les commandes Discord.

### Client C++

Avec Visual Studio 2022 :

```bash
cd client-cpp
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --config Release
```

Consultez `client-cpp/CMakeLists.txt` et les sources du client pour les options et l’intégration dans un autre exécutable.

## Produits et stock du Temp Spoofer

Le produit utilise le slug `spoofer`. La configuration des offres, prix et clés fournisseur se fait dans le dashboard, dans l’espace dédié aux clés du Temp Spoofer. Les prix configurés actuellement sont 7 jours à 8,99 €, 14 jours à 16,99 € et 30 jours à 29,99 €. L’offre 1 jour peut être configurée séparément dans le dashboard.

Le stock disponible est affiché par durée sur la boutique. Une offre sans clé disponible ne peut pas être achetée. Les clés sont réservées pendant le paiement, mais ne sont décomptées comme vendues et livrées qu’après confirmation du paiement. Le dashboard permet de consulter les clés disponibles, réservées ou livrées, ainsi que l’ordre, le client et les dates associés. Les commandes en attente peuvent être supprimées depuis l’onglet Commandes ; leur réservation est alors libérée. Une clé livrée n’est jamais remise en stock.

Le fichier du spoofer se gère dans l’onglet d’upload dédié. Après un achat confirmé, le client retrouve sa clé et le bouton de téléchargement dans son profil. N’ajoutez pas de clés réelles dans le dépôt ou dans ce README. Pour les règles détaillées de réservation et de réconciliation des paiements, voir [`docs/spoofer.md`](docs/spoofer.md).

## Paiements et livraison

- Configurez les clés et signatures du fournisseur utilisé dans l’environnement du backend.
- Configurez les webhooks de paiement vers l’API, avec les URL et secrets correspondant à l’environnement.
- La livraison d’une clé du Temp Spoofer intervient après confirmation du paiement ; les événements d’échec et d’expiration libèrent les réservations selon le flux du fournisseur.
- Les téléchargements de produits achetés sont servis via l’accès du compte client. Ne rendez pas les fichiers privés accessibles par une URL publique permanente.
- Vérifiez les commandes et événements de webhook dans le dashboard et les journaux avant toute intervention manuelle sur l’inventaire.

Les endpoints et payloads varient selon les modules et versions intégrés ; consultez les contrôleurs backend et la documentation API du projet avant d’intégrer un client externe.

## Tests et maintenance

Dans `backend/`, les scripts disponibles incluent :

```bash
npm test
npm run lint
npm run build
```

Les tests d’intégration du stock du spoofer peuvent être lancés avec :

```bash
SPOOFER_INTEGRATION=1 npm test -- --runInBand test/spoofer.spec.ts
```

Ces tests d’intégration nécessitent une base PostgreSQL configurée pour les tests et créent/suppriment un schéma temporaire. Ils n’utilisent pas de clés commerciales.

Les interfaces disposent de scripts `build` et `preview` dans leurs dossiers respectifs. Le bot expose `npm run start`, `npm run dev` et `npm run deploy`.

## Déploiement et sécurité

- Remplacez toutes les valeurs de démonstration et révoquez tout secret qui aurait été exposé.
- Servez les interfaces et l’API derrière HTTPS et un reverse proxy correctement configuré.
- Gardez les ports PostgreSQL et Redis privés ; ne les exposez pas à Internet.
- Configurez les origines CORS exactes et `TRUST_PROXY` uniquement si l’API est derrière un proxy de confiance.
- Sauvegardez PostgreSQL et les fichiers privés du backend ; testez la restauration.
- Gardez les clés fournisseur et les fichiers du spoofer hors du dépôt et hors des journaux.
- Vérifiez la configuration des webhooks, les permissions d’accès et les politiques de téléchargement avant la mise en production.

Le guide [`docs/PRODUCTION_HARDENING.md`](docs/PRODUCTION_HARDENING.md) donne des recommandations complémentaires.

## Documentation complémentaire

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture et flux de licence.
- [`docs/PRODUCTION_HARDENING.md`](docs/PRODUCTION_HARDENING.md) — recommandations de durcissement.
- [`docs/spoofer.md`](docs/spoofer.md) — stock, paiements et livraison du Temp Spoofer.
- `backend/prisma/schema.prisma` — modèle de données.
- `docker-compose.yml` — services conteneurisés et ports.
