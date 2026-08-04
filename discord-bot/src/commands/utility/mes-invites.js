'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors  = require('../../config/colors');
const { stmts } = require('../../services/database');
const { PLAN_LABELS } = require('../../services/contestHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mes-invites')
    .setDescription('Voir combien d\'invitations tu as dans le concours en cours'),

  async execute(interaction) {
    const contest = stmts.getActiveContest.get(interaction.guildId);
    if (!contest) {
      return interaction.reply({
        embeds: [{ color: Colors.WARNING, description: '⚠️ Aucun concours en cours pour le moment.' }],
        ephemeral: true,
      });
    }

    const { count } = stmts.getContestInviteCount.get(contest.id, interaction.user.id);
    const planLbl   = PLAN_LABELS[contest.plan] || contest.plan;
    const endsAt    = new Date(contest.ends_at * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    const qualified = count >= contest.invites_required;

    return interaction.reply({
      embeds: [{
        color: qualified ? Colors.SUCCESS : Colors.PRIMARY,
        title: '🎟️ Mes invitations — Concours 404 Client',
        description: qualified
          ? `✅ Tu es **qualifié(e)** pour le tirage au sort !`
          : `Tu as encore **${contest.invites_required - count}** invitation(s) à faire pour être qualifié(e).`,
        fields: [
          { name: '🎫 Tes invitations',  value: `**${count}** / ${contest.invites_required} requises`, inline: true },
          { name: '🎁 Prix',             value: `Licence **${planLbl}**`, inline: true },
          { name: '⏰ Fin du concours',  value: endsAt, inline: true },
        ],
        footer: { text: '404 Client • Concours' },
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });
  },
};
