'use strict';

const { stmts } = require('./database');
const Colors    = require('../config/colors');

const PLAN_LABELS = {
  DAYS_30:  '30 Jours',
  DAYS_90:  '90 Jours',
  DAYS_365: '1 An',
  LIFETIME: 'Lifetime',
};

/**
 * Construit l'embed du concours avec le classement en temps réel.
 */
function buildContestEmbed(contest) {
  const endsAt  = new Date(contest.ends_at * 1000);
  const now     = new Date();
  const ended   = contest.ended || endsAt <= now;
  const board   = stmts.getContestLeaderboard.all(contest.id);
  const planLbl = PLAN_LABELS[contest.plan] || contest.plan;

  const top = board.slice(0, 10).map((row, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    const qualified = row.invites >= contest.invites_required ? ' ✅' : '';
    return `${medal} <@${row.inviter_id}> — **${row.invites}** invitation(s)${qualified}`;
  });

  const qualifiedCount = board.filter(r => r.invites >= contest.invites_required).length;

  const fields = [
    {
      name: '🎁 Prix',
      value: `Clé de licence **${planLbl}**`,
      inline: true,
    },
    {
      name: '🎯 Condition',
      value: `Inviter **${contest.invites_required}** ami(s)`,
      inline: true,
    },
    {
      name: ended ? '🔒 Terminé le' : '⏰ Se termine le',
      value: endsAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      inline: true,
    },
    {
      name: `🏆 Classement (${board.length} participant(s) — ${qualifiedCount} qualifié(s))`,
      value: top.length > 0 ? top.join('\n') : '*Aucune invitation pour l\'instant…*',
    },
  ];

  if (ended && contest.winner_id) {
    fields.push({
      name: '🎉 Gagnant',
      value: `<@${contest.winner_id}> — La clé lui a été envoyée en DM !`,
    });
  }

  return {
    color: ended ? Colors.GOLD : Colors.PRIMARY,
    title: ended ? '🎊 Concours terminé — Invite un ami !' : '🎊 Concours — Invite tes amis !',
    description: ended
      ? `Le concours est terminé. Merci à tous les participants !`
      : [
          `> Invite **${contest.invites_required} amis** sur ce serveur pour participer au tirage au sort !`,
          `> Le gagnant remporte une clé de licence **${planLbl}** pour **404 Tweaks**.`,
          '',
          '**Comment participer ?**',
          '1. Crée une invitation Discord pour ce serveur',
          `2. Envoie-la à tes amis — chaque ami qui rejoint compte !`,
          `3. Atteins **${contest.invites_required} invitation(s)** pour être qualifié`,
          '4. Un gagnant est tiré au sort parmi les qualifiés à la fin du concours',
        ].join('\n'),
    fields,
    footer: { text: '404 Tweaks • Concours' },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Met à jour l'embed du concours dans le salon Discord.
 */
async function updateContestEmbed(client, contest) {
  try {
    const channel = await client.channels.fetch(contest.channel_id).catch(() => null);
    if (!channel) return;
    const message = await channel.messages.fetch(contest.message_id).catch(() => null);
    if (!message) return;
    await message.edit({ embeds: [buildContestEmbed(contest)] });
  } catch (_) {}
}

module.exports = { buildContestEmbed, updateContestEmbed, PLAN_LABELS };
