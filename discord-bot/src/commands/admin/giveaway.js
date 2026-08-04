'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Colors  = require('../../config/colors');
const { stmts } = require('../../services/database');
const logger  = require('../../services/logger');

function buildGiveawayButton(giveawayId, count = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:enter:${giveawayId}`)
      .setLabel(`🎉 Participer${count > 0 ? ` (${count})` : ''}`)
      .setStyle(ButtonStyle.Primary),
  );
}

function buildGiveawayEmbed({ prize, winnersCount, endsAt, hostId, requiredRole, giveawayId }) {
  const lines = [
    `**Lot :** ${prize}`,
    `**Gagnant(s) :** ${winnersCount}`,
    `**Fin :** <t:${endsAt}:F> (<t:${endsAt}:R>)`,
    `**Organisé par :** <@${hostId}>`,
  ];
  if (requiredRole) lines.push(`**Rôle requis :** <@&${requiredRole.id}>`);

  return {
    color: Colors.PRIMARY,
    title: `🎉 GIVEAWAY — ${prize}`,
    description: lines.join('\n'),
    footer: { text: `Giveaway #${giveawayId} | ${winnersCount} gagnant(s)${requiredRole ? ` | Réservé aux ${requiredRole.name}` : ''}` },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Ends a giveaway: picks winners from DB entries, edits the embed, announces in channel.
 */
async function endGiveaway(client, row) {
  stmts.markGiveawayEnded.run(row.id);

  const guild = client.guilds.cache.get(row.guild_id);
  if (!guild) return;

  const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(row.message_id).catch(() => null);

  const entries = stmts.getGiveawayEntries.all(row.id);

  if (entries.length === 0) {
    const noOneEmbed = {
      color: Colors.WARNING,
      title: `🎉 Giveaway terminé — ${row.prize}`,
      description: 'Aucun participant. Le giveaway est annulé.',
      footer: { text: `Giveaway #${row.id} | 0 participants` },
      timestamp: new Date().toISOString(),
    };
    if (message) await message.edit({ embeds: [noOneEmbed], components: [] }).catch(() => {});
    await channel.send({ embeds: [noOneEmbed] }).catch(() => {});
    logger.info(`[GIVEAWAY #${row.id}] Terminé sans participants — ${row.prize}`);
    return;
  }

  // Tirage au sort
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, Math.min(row.winners_count, shuffled.length));
  const winnerMentions = winners.map(e => `<@${e.user_id}>`).join(', ');

  const endedEmbed = {
    color: Colors.GOLD,
    title: `🎉 Giveaway terminé — ${row.prize}`,
    description: [
      `**Gagnant(s) :** ${winnerMentions}`,
      '',
      `*${entries.length} participant(s) au total.*`,
    ].join('\n'),
    footer: { text: `Giveaway #${row.id} — Organisé par <@${row.host_id}>` },
    timestamp: new Date().toISOString(),
  };

  if (message) await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});

  await channel.send({
    content: `Félicitations ${winnerMentions} ! 🎊 Vous avez gagné **${row.prize}** !`,
    embeds: [endedEmbed],
  }).catch(() => {});

  logger.info(`[GIVEAWAY #${row.id}] Gagnant(s): ${winners.map(e => e.user_id).join(', ')} — ${row.prize}`);
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
        .addRoleOption(o =>
          o.setName('rôle').setDescription('Rôle requis pour participer. Laisse vide = tout le monde.')
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('Terminer un giveaway immédiatement')
        .addIntegerOption(o =>
          o.setName('id').setDescription('ID du giveaway (affiché dans le footer)').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── START ──────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      await interaction.deferReply({ ephemeral: true });

      const prize        = interaction.options.getString('lot');
      const durationMin  = interaction.options.getInteger('durée');
      const winnersCount = interaction.options.getInteger('gagnants') ?? 1;
      const requiredRole = interaction.options.getRole('rôle') ?? null;
      const endsAt       = Math.floor(Date.now() / 1000) + durationMin * 60;

      // Envoi d'un message temporaire pour récupérer l'ID
      const tempEmbed = buildGiveawayEmbed({ prize, winnersCount, endsAt, hostId: interaction.user.id, requiredRole, giveawayId: 0 });
      const msg = await interaction.channel.send({ embeds: [tempEmbed] });

      const result = stmts.createGiveaway.run({
        guild_id:         interaction.guildId,
        channel_id:       interaction.channelId,
        message_id:       msg.id,
        host_id:          interaction.user.id,
        prize,
        winners_count:    winnersCount,
        ends_at:          endsAt,
        required_role_id: requiredRole?.id ?? null,
      });

      const giveawayId = result.lastInsertRowid;

      // Mise à jour avec l'ID réel et le bouton
      const embed = buildGiveawayEmbed({ prize, winnersCount, endsAt, hostId: interaction.user.id, requiredRole, giveawayId });
      await msg.edit({ embeds: [embed], components: [buildGiveawayButton(giveawayId)] }).catch(() => {});

      logger.info(`[GIVEAWAY #${giveawayId}] Lancé par ${interaction.user.tag} — ${prize} (${durationMin} min, ${winnersCount} gagnant(s))`);

      return interaction.editReply({
        embeds: [{
          color: Colors.SUCCESS,
          description: `✅ Giveaway **#${giveawayId}** lancé !\nTermine <t:${endsAt}:R>.`,
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
        embeds: [{ color: Colors.SUCCESS, description: `✅ Giveaway **#${id}** terminé manuellement.` }],
      });
    }
  },

  endGiveaway,
};
