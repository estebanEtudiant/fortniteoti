'use strict';

/**
 * Script à lancer UNE FOIS pour enregistrer les commandes slash.
 *   node deploy-commands.js           → déploiement global (peut prendre ~1h pour propager)
 *   GUILD_ID=xxx node deploy-commands.js → déploiement instantané sur un serveur de test
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID  = process.env.GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID sont requis dans le fichier .env');
  process.exit(1);
}

// Charge tous les fichiers de commandes
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const categories   = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(categoryPath, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`Enregistrement de ${commands.length} commande(s)…`);

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ Commandes déployées sur le serveur ${GUILD_ID} (instantané).`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Commandes déployées globalement (propagation ~1h).');
    }

    commands.forEach(c => console.log(`  /${c.name}`));
  } catch (err) {
    console.error('Erreur lors du déploiement :', err);
    process.exit(1);
  }
})();
