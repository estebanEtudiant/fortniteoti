'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors = require('../../config/colors');
const logger = require('../../services/logger');
const { stmts } = require('../../services/database');
const { generateKeys } = require('../../services/licenseApi');
const { buildContestEmbed, updateContestEmbed, PLAN_LABELS } = require('../../services/contestHelper');

// Durées disponibles
const DURATIONS = {
  '1h':  3600,
  '6h':  6 * 3600,
  '12h': 12 * 3600,
  '24h': 24 * 3600,
  '3j':  3 * 24 * 3600,
  '7j':  7 * 24 * 3600,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('concours')
    .setDescription('Gestion du concours d\'invitations')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ── Sous-commande : lancer ──────────────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('lancer')
      .setDescription('Lance un concours d\'invitations — invite X amis pour gagner une clé')
      .addIntegerOption(o => o
        .setName('invitations')
        .setDescription('Nombre d\'invitations requises pour être qualifié (défaut : 2)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
      )
      .addStringOption(o => o
        .setName('plan')
        .setDescription('Plan de la clé à gagner (défaut : 30 jours)')
        .setRequired(false)
        .addChoices(
          { name: '30 Jours',  value: 'DAYS_30'  },
          { name: '90 Jours',  value: 'DAYS_90'  },
          { name: '1 An',      value: 'DAYS_365' },
          { name: 'Lifetime',  value: 'LIFETIME'  },
        )
      )
      .addStringOption(o => o
        .setName('durée')
        .setDescription('Durée du concours (défaut : 24h)')
        .setRequired(false)
        .addChoices(
          { name: '1 heure',   value: '1h'  },
          { name: '6 heures',  value: '6h'  },
          { name: '12 heures', value: '12h' },
          { name: '24 heures', value: '24h' },
          { name: '3 jours',   value: '3j'  },
          { name: '7 jours',   value: '7j'  },
        )
      )
    )

    // ── Sous-commande : classement ──────────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('classement')
      .setDescription('Affiche le classement du concours en cours')
    )

    // ── Sous-commande : terminer ────────────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('terminer')
      .setDescription('Termine le concours, tire un gagnant au sort et envoie la clé en DM')
    ),

  // ─── Handler principal ────────────────────────────────────────────────────
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'lancer')     return handleLancer(interaction);
    if (sub === 'classement') return handleClassement(interaction);
    if (sub === 'terminer')   return handleTerminer(interaction);
  },
};

// ─── /concours lancer ────────────────────────────────────────────────────────
async function handleLancer(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Vérifie qu'il n'y a pas déjà un concours actif
  const existing = stmts.getActiveContest.get(interaction.guildId);
  if (existing) {
    return interaction.editReply({
      embeds: [{ color: Colors.ERROR, description: '❌ Un concours est déjà en cours ! Utilise `/concours terminer` d\'abord.' }],
    });
  }

  const invitesRequired = interaction.options.getInteger('invitations') ?? 2;
  const plan            = interaction.options.getString('plan')         ?? 'DAYS_30';
  const durationKey     = interaction.options.getString('durée')        ?? '24h';
  const durationSec     = DURATIONS[durationKey] ?? DURATIONS['24h'];
  const endsAt          = Math.floor(Date.now() / 1000) + durationSec;

  // Crée l'embed dans le salon courant
  const tempEmbed = buildContestEmbed({
    id: 0, guild_id: interaction.guildId, channel_id: interaction.channelId,
    message_id: '0', host_id: interaction.user.id,
    plan, invites_required: invitesRequired, ends_at: endsAt, ended: 0,
    winner_id: null, prize_key: null,
  });

  const msg = await interaction.channel.send({ embeds: [tempEmbed] }).catch(err => {
    logger.error('[CONCOURS] Impossible d\'envoyer l\'embed:', err);
    return null;
  });

  if (!msg) {
    return interaction.editReply({ embeds: [{ color: Colors.ERROR, description: '❌ Impossible de poster l\'embed dans ce salon.' }] });
  }

  // Sauvegarde en DB
  const info = stmts.createContest.run({
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
    message_id: msg.id,
    host_id: interaction.user.id,
    plan,
    invites_required: invitesRequired,
    ends_at: endsAt,
  });

  logger.info(`[CONCOURS] Concours #${info.lastInsertRowid} lancé par ${interaction.user.tag} — ${invitesRequired} invites requises, plan: ${plan}`);

  // Met à jour l'embed avec l'ID réel
  const contest = stmts.getContestById.get(info.lastInsertRowid);
  await msg.edit({ embeds: [buildContestEmbed(contest)] }).catch(() => {});

  // Prépare le timer de fin automatique
  scheduleAutoEnd(interaction.client, contest);

  const planLbl = PLAN_LABELS[plan] || plan;
  return interaction.editReply({
    embeds: [{
      color: Colors.SUCCESS,
      description: `✅ Concours lancé ! **${invitesRequired}** invitation(s) requises pour gagner une clé **${planLbl}**.\nDurée : **${durationKey}**`,
    }],
  });
}

// ─── /concours classement ────────────────────────────────────────────────────
async function handleClassement(interaction) {
  const contest = stmts.getActiveContest.get(interaction.guildId);
  if (!contest) {
    return interaction.reply({
      embeds: [{ color: Colors.ERROR, description: '❌ Aucun concours actif en ce moment.' }],
      ephemeral: true,
    });
  }

  const board = stmts.getContestLeaderboard.all(contest.id);
  const planLbl = PLAN_LABELS[contest.plan] || contest.plan;

  const top = board.slice(0, 15).map((row, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const badge = row.invites >= contest.invites_required ? ' ✅ Qualifié' : '';
    return `${medal} <@${row.inviter_id}> — **${row.invites}** invitation(s)${badge}`;
  });

  const qualified = board.filter(r => r.invites >= contest.invites_required).length;
  const endsAt = new Date(contest.ends_at * 1000);

  return interaction.reply({
    embeds: [{
      color: Colors.PRIMARY,
      title: '🏆 Classement du concours',
      description: top.length > 0 ? top.join('\n') : '*Aucun participant pour l\'instant*',
      fields: [
        { name: '🎁 Prix',        value: `Licence **${planLbl}**`,   inline: true },
        { name: '✅ Qualifiés',   value: `**${qualified}** joueur(s)`, inline: true },
        { name: '⏰ Fin',         value: endsAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }), inline: true },
        { name: '🎯 Condition',   value: `${contest.invites_required} invitation(s)`, inline: true },
      ],
      footer: { text: '404 Tweaks • Concours' },
    }],
    ephemeral: true,
  });
}

// ─── /concours terminer ──────────────────────────────────────────────────────
async function handleTerminer(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const contest = stmts.getActiveContest.get(interaction.guildId);
  if (!contest) {
    return interaction.editReply({
      embeds: [{ color: Colors.ERROR, description: '❌ Aucun concours actif à terminer.' }],
    });
  }

  return drawWinner(interaction.client, contest, interaction);
}

// ─── Logique tirage au sort ───────────────────────────────────────────────────
async function drawWinner(client, contest, interaction = null) {
  // Participants qualifiés (ont le nombre d'invitations requis)
  const qualified = stmts.getContestParticipants.all(contest.id, contest.invites_required);

  const respond = async (embeds) => {
    if (interaction) {
      await interaction.editReply({ embeds }).catch(() => {});
    }
  };

  if (qualified.length === 0) {
    // Aucun qualifié — clôture sans gagnant
    stmts.endContest.run({ id: contest.id, winner_id: null, prize_key: null });
    await updateContestEmbed(client, { ...contest, ended: 1, winner_id: null }).catch(() => {});

    logger.info(`[CONCOURS] Concours #${contest.id} terminé — aucun qualifié`);
    await respond([{ color: Colors.GOLD, description: '🏁 Concours terminé. Aucun participant qualifié cette fois.' }]);
    return;
  }

  // Tirage au sort
  const winner = qualified[Math.floor(Math.random() * qualified.length)];

  // Génère la clé via l'API backend
  const result = await generateKeys(contest.plan, 1);
  const prizeKey = result?.success && result.keys?.length > 0 ? result.keys[0] : null;

  // Sauvegarde en DB
  stmts.endContest.run({ id: contest.id, winner_id: winner.inviter_id, prize_key: prizeKey || null });

  // Met à jour l'embed avec le gagnant
  await updateContestEmbed(client, { ...contest, ended: 1, winner_id: winner.inviter_id }).catch(() => {});

  // Envoie la clé au gagnant en DM
  const winnerUser = await client.users.fetch(winner.inviter_id).catch(() => null);
  if (winnerUser) {
    const dmLines = [
      `🎉 **Félicitations ${winnerUser.username} !**`,
      '',
      `Tu as été **tiré au sort** parmi les ${qualified.length} participant(s) qualifié(s) du concours **404 Tweaks** !`,
      '',
    ];

    if (prizeKey) {
      dmLines.push(`🔑 **Ta clé de licence (${PLAN_LABELS[contest.plan] || contest.plan}) :**`);
      dmLines.push(`\`\`\`${prizeKey}\`\`\``);
      dmLines.push('Utilise `/verify <clé>` sur le serveur Discord pour activer tes rôles.');
      dmLines.push('Rends-toi sur **404tweaks.tech** pour télécharger le logiciel.');
    } else {
      dmLines.push('⚠️ La clé n\'a pas pu être générée automatiquement. Un admin va te la transmettre sous peu.');
    }

    await winnerUser.send({
      embeds: [{
        color: Colors.GOLD,
        title: '🏆 Tu as gagné le concours 404 Tweaks !',
        description: dmLines.join('\n'),
        footer: { text: '404 Tweaks • Concours' },
        timestamp: new Date().toISOString(),
      }],
    }).catch(() => {
      logger.warn(`[CONCOURS] Impossible d\'envoyer le DM au gagnant ${winner.inviter_id}`);
    });
  }

  logger.info(`[CONCOURS] Concours #${contest.id} terminé — Gagnant: ${winner.inviter_id} (${winner.invites} invites) — Clé: ${prizeKey || 'ERREUR'}`);

  await respond([{
    color: Colors.GOLD,
    title: '🎊 Concours terminé !',
    description: [
      `**Gagnant :** <@${winner.inviter_id}> avec **${winner.invites}** invitation(s)`,
      `**Qualifiés :** ${qualified.length} participant(s)`,
      prizeKey ? `**Clé générée :** \`${prizeKey}\`` : '⚠️ Erreur génération clé — à envoyer manuellement',
      '',
      'La clé a été envoyée en DM au gagnant.',
    ].join('\n'),
  }]);
}

// ─── Timer de fin automatique ────────────────────────────────────────────────
function scheduleAutoEnd(client, contest) {
  const delay = (contest.ends_at * 1000) - Date.now();
  if (delay <= 0) return;

  // Max 2^31-1 ms pour setTimeout (~24 jours) — suffit pour nos durées
  const safeDelay = Math.min(delay, 2147483647);

  setTimeout(async () => {
    // Recharge depuis DB au cas où le concours aurait été terminé manuellement
    const fresh = stmts.getContestById.get(contest.id);
    if (!fresh || fresh.ended) return;
    logger.info(`[CONCOURS] Fin automatique du concours #${contest.id}`);
    await drawWinner(client, fresh);
  }, safeDelay);
}
