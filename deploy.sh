#!/bin/bash
  cd ~/fortniteoti
  git pull origin main

  cd storefront
  npm install
  npm run build
  sudo cp -r dist/* /var/www/storefront/

  cd ../dashboard
  npm install
  npm run build
  sudo cp -r dist/* /var/www/dashboard/

  cd ../backend
  npm install
  npx prisma migrate deploy
  npx prisma generate
  pm2 restart ftn-backend

  echo "Deploy terminé !"
