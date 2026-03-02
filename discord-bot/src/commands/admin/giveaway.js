'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors  = require('../../config/colors');
const { db, stmts } = require('../../services/database');
const logger  = require('../../services/logger');

const GIVEAWAY_EMOJI = '🎉';

/**
 * Picks N unique random elements from an array.
 */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/**
 * Fetches all users who reacted with 🎉 on the giveaway message, excluding bots.
 */
async function fetchParticipants(guild, channelId, messageId) {
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return [];
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return [];
    const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
    if (!reaction) return [];
    const users = await reaction.users.fetch();
    return users.filter(u => !u.bot).map(u => u);
  } catch {
    return [];
  }
}

/**
 * Ends a giveaway: picks winners, edits the embed, announces in channel.
 */
async function endGiveaway(client, row) {
  stmts.markGiveawayEnded.run(row.id);

  const guild = client.guilds.cache.get(row.guild_id);
  if (!guild) return;

  const participants = await fetchParticipants(guild, row.channel_id, row.message_id);

  const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(row.message_id).catch(() => null);

  if (participants.length === 0) {
    const noOneEmbed = {
      color:  Colors.WARNING,
      title:  `🎉 Giveaway terminé — ${row.prize}`,
      description: 'Aucun participant. Le giveaway est annulé.',
      footer: { text: `Giveaway #${row.id} | 0 participants` },
      timestamp: new Date().toISOString(),
    };
    if (message) await message.edit({ embeds: [noOneEmbed] }).catch(() => {});
    await channel.send({ embeds: [noOneEmbed] }).catch(() => {});
    logger.info(`[GIVEAWAY #${row.id}] Terminé sans participants — ${row.prize}`);
    return;
  }

  const winners = pickRandom(participants, row.winners_count);
  const winnerMentions = winners.map(u => `<@${u.id}>`).join(', ');

  const endedEmbed = {
    color:  Colors.GOLD,
    title:  `🎉 Giveaway terminé — ${row.prize}`,
    description: [
      `**Gagnant(s) :** ${winnerMentions}`,
      '',
      `*${participants.length} participant(s) au total.*`,
    ].join('\n'),
    footer: { text: `Giveaway #${row.id} — Organisé par <@${row.host_id}>` },
    timestamp: new Date().toISOString(),
  };

  if (message) await message.edit({ embeds: [endedEmbed] }).catch(() => {});

  await channel.send({
    content: `Félicitations ${winnerMentions} ! 🎊 Vous avez gagné **${row.prize}** !`,
    embeds: [endedEmbed],
  }).catch(() => {});

  logger.info(`[GIVEAWAY #${row.id}] Gagnant(s): ${winners.map(u => u.tag).join(', ')} — ${row.prize}`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gérer les giveaways (staff uniquement)')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Lancer un giveaway')
        .addStringOption(o =>
          o.setName('lot').setDescription('Lot à gagner').setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName('durée').setDescription('Durée en minutes').setRequired(true).setMinValue(1).setMaxValue(10080)
        )
        .addIntegerOption(o =>
          o.setName('gagnants').setDescription('Nombre de gagnants (défaut : 1)').setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('Terminer un giveaway immédiatement')
        .addIntegerOption(o =>
          o.setName('id').setDescription('ID du giveaway (affiché dans le footer de l\'embed)').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── START ──────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      await interaction.deferReply({ ephemeral: true });

      const prize      = interaction.options.getString('lot');
      const durationMin = interaction.options.getInteger('durée');
      const winnersCount = interaction.options.getInteger('gagnants') ?? 1;
      const endsAt = Math.floor(Date.now() / 1000) + durationMin * 60;

      const endDate = new Date(endsAt * 1000);
      const endStr  = endDate.toLocaleString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const embed = {
        color:  Colors.PRIMARY,
        title:  `🎉 GIVEAWAY — ${prize}`,
        description: [
          `Réagissez avec ${GIVEAWAY_EMOJI} pour participer !`,
          '',
          `**Lot :** ${prize}`,
          `**Gagnant(s) :** ${winnersCount}`,
          `**Fin :** ${endStr}`,
          `**Organisé par :** <@${interaction.user.id}>`,
        ].join('\n'),
        footer:    { text: 'ID du giveaway sera affiché après envoi' },
        timestamp: new Date().toISOString(),
      };

      // Send the giveaway message in the current channel
      const msg = await interaction.channel.send({ embeds: [embed] });
      await msg.react(GIVEAWAY_EMOJI).catch(() => {});

      // Store in DB
      const result = stmts.createGiveaway.run({
        guild_id:      interaction.guildId,
        channel_id:    interaction.channelId,
        message_id:    msg.id,
        host_id:       interaction.user.id,
        prize,
        winners_count: winnersCount,
        ends_at:       endsAt,
      });

      const giveawayId = result.lastInsertRowid;

      // Edit embed to include the ID
      await msg.edit({
        embeds: [{
          ...embed,
          footer: { text: `Giveaway #${giveawayId} | ${winnersCount} gagnant(s)` },
        }],
      }).catch(() => {});

      logger.info(`[GIVEAWAY #${giveawayId}] Lancé par ${interaction.user.tag} — ${prize} (${durationMin} min, ${winnersCount} gagnant(s))`);

      return interaction.editReply({
        embeds: [{
          color: Colors.SUCCESS,
          description: `✅ Giveaway **#${giveawayId}** lancé avec succès !\nTermine dans **${durationMin} minute(s)**.`,
        }],
      });
    }

    // ── END ────────────────────────────────────────────────────────────────────
    if (sub === 'end') {
      await interaction.deferReply({ ephemeral: true });

      const id  = interaction.options.getInteger('id');
      const row = stmts.getGiveaway.get(id);

      if (!row) {
        return interaction.editReply({
          embeds: [{ color: Colors.ERROR, description: `❌ Giveaway #${id} introuvable.` }],
        });
      }

      if (row.ended) {
        return interaction.editReply({
          embeds: [{ color: Colors.WARNING, description: `⚠️ Giveaway #${id} est déjà terminé.` }],
        });
      }

      await endGiveaway(interaction.client, row);

      return interaction.editReply({
        embeds: [{
          color: Colors.SUCCESS,
          description: `✅ Giveaway **#${id}** terminé manuellement.`,
        }],
      });
    }
  },

  // Expose endGiveaway so the scheduler can use it
  endGiveaway,
};
