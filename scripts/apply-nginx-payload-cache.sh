#!/bin/bash
# Désactive le cache nginx sur les endpoints payload de l'API.
# Usage: sudo bash apply-nginx-payload-cache.sh

set -euo pipefail

CONF="/etc/nginx/sites-enabled/404tweaks.tech"
MARKER="payload/:product/file"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Relance avec sudo: sudo bash $0"
  exit 1
fi

if grep -q "$MARKER" "$CONF" 2>/dev/null || grep -q 'proxy_no_cache 1' "$CONF"; then
  echo "La config anti-cache semble déjà présente dans $CONF"
else
  cp "$CONF" "${CONF}.bak.$(date +%s)"
  python3 - <<'PY'
from pathlib import Path
conf = Path("/etc/nginx/sites-enabled/404tweaks.tech")
text = conf.read_text()
old = """    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_request_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/404tweaks.tech/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/404tweaks.tech/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.404tweaks.tech) {"""

new = """    location ~ ^/api/v1/software/payload/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_request_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_request_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/404tweaks.tech/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/404tweaks.tech/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.404tweaks.tech) {"""

if old not in text:
    raise SystemExit("Bloc API introuvable — édite $CONF manuellement.")
conf.write_text(text.replace(old, new, 1))
print("Config nginx mise à jour.")
PY
fi

nginx -t
systemctl reload nginx
echo "OK — nginx rechargé."
