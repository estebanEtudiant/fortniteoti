'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors     = require('../../config/colors');
const licenseApi = require('../../services/licenseApi');
const logger     = require('../../services/logger');

const PLAN_LABELS = {
  DAYS_1:   '1 Jour',   DAYS_7:  '7 Jours',  DAYS_14: '14 Jours',
  DAYS_30:  '30 Jours', DAYS_90: '90 Jours', DAYS_365: '1 An',
  LIFETIME: 'Lifetime',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Génère une ou plusieurs clés de licence (staff uniquement)')
    .addStringOption(o =>
      o.setName('plan')
       .setDescription('Plan de la licence')
       .setRequired(true)
       .addChoices(
         { name: '1 Jour',    value: 'DAYS_1' },
         { name: '7 Jours',   value: 'DAYS_7' },
         { name: '14 Jours',  value: 'DAYS_14' },
         { name: '30 Jours',  value: 'DAYS_30' },
         { name: '90 Jours',  value: 'DAYS_90' },
         { name: '1 An',      value: 'DAYS_365' },
         { name: 'Lifetime',  value: 'LIFETIME' },
       )
    )
    .addIntegerOption(o =>
      o.setName('quantité')
       .setDescription('Nombre de clés à générer (1-10, défaut : 1)')
       .setMinValue(1)
       .setMaxValue(10)
       .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const plan  = interaction.options.getString('plan');
    const count = interaction.options.getInteger('quantité') ?? 1;

    const result = await licenseApi.generateKeys(plan, count);

    if (!result.success) {
      return interaction.editReply({
        embeds: [{
          color:       Colors.ERROR,
          description: `❌ Erreur lors de la génération : ${result.reason}`,
        }],
      });
    }

    const planLabel = PLAN_LABELS[plan] || plan;
    const keyLines  = result.keys.map((k, i) => `\`${i + 1}.\` \`${k}\``).join('\n');

    logger.info(`[GENERATE] ${count}x ${plan} généré(s) par ${interaction.user.tag}`);

    return interaction.editReply({
      embeds: [{
        color:       Colors.GOLD,
        title:       `🔑 ${count} clé(s) générée(s) — Plan ${planLabel}`,
        description: keyLines,
        footer:      { text: '⚠️ Ces clés sont à usage unique — à transmettre de façon sécurisée.' },
        timestamp:   new Date().toISOString(),
      }],
    });
  },
};
