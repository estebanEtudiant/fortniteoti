# Production Hardening

## Objectif

Exposer uniquement le reverse proxy au public et garder PostgreSQL, Redis, l'API et les dashboards accessibles en local sur `127.0.0.1`.

## Variables backend

Dans `backend/.env`:

```env
NODE_ENV=production
HOST=127.0.0.1
TRUST_PROXY=true
OFFLINE_TOKEN_SECRET=remplacer_par_un_secret_hex_fort
```

## Reverse Proxy Nginx

Exemple minimal:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.example.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ensuite:

```bash
sudo certbot --nginx -d api.example.com -d admin.example.com -d example.com
```

## Firewall UFW

Ne jamais activer UFW sans ouvrir SSH d'abord.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw deny 3002/tcp
sudo ufw deny 5173/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
sudo ufw enable
sudo ufw status verbose
```

## Vérifications

```bash
curl -I http://127.0.0.1:3000/api/v1/health
curl -I https://api.example.com/api/v1/health
curl -I https://admin.example.com
curl -I https://example.com
```
