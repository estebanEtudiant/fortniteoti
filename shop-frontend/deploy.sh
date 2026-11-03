#!/bin/bash
# Déploie la boutique vers /var/www/shop (nécessite sudo)
set -e
SRC=/home/deploy/404SHOP_extract
DEST=/var/www/shop
sudo cp -r "$SRC"/* "$DEST"/
sudo cp "$DEST/404.html" "$DEST/index.html"
echo "Déployé: $SRC -> $DEST"
