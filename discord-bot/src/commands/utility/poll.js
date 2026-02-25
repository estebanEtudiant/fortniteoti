'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors = require('../../config/colors');
const logger = require('../../services/logger');

// Emojis pour les options de vote
const OPTION_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

const DURATIONS_MS = {
  '15min': 15 * 60 * 1000,
  '1h':    60 * 60 * 1000,
  '6h':    6  * 60 * 60 * 1000,
  '12h':  12  * 60 * 60 * 1000,
  '24h':  24  * 60 * 60 * 1000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Lance un sondage dans le salon courant')
    .addStringOption(o =>
      o.setName('question')
       .setDescription('La question du sondage')
       .setRequired(true)
       .setMaxLength(200)
    )
    .addStringOption(o =>
      o.setName('options')
       .setDescription('Options séparées par des virgules (ex: "Oui,Non,Peut-être")')
       .setRequired(true)
       .setMaxLength(300)
    )
    .addStringOption(o =>
      o.setName('durée')
       .setDescription('Durée du sondage (défaut : 1h)')
       .setRequired(false)
       .addChoices(
         { name: '15 minutes', value: '15min' },
         { name: '1 heure',    value: '1h' },
         { name: '6 heures',   value: '6h' },
         { name: '12 heures',  value: '12h' },
         { name: '24 heures',  value: '24h' },
       )
    ),

  async execute(interaction) {
    const question    = interaction.options.getString('question');
    const rawOptions  = interaction.options.getString('options');
    const durationKey = interaction.options.getString('durée') ?? '1h';

    // Parse les options (max 4)
    const options = rawOptions
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (options.length < 2) {
      return interaction.reply({
        embeds: [{ color: Colors.ERROR, description: '❌ Il faut au moins 2 options séparées par des virgules.' }],
        ephemeral: true,
      });
    }

    const durationMs = DURATIONS_MS[durationKey];
    const endsAt     = new Date(Date.now() + durationMs);
    const endsAtStr  = endsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endsAtDate = endsAt.toLocaleDateString('fr-FR');

    const optionLines = options.map((opt, i) => `${OPTION_EMOJIS[i]} ${opt}`).join('\n');

    // Répond d'abord pour obtenir le message
    await interaction.reply({
      embeds: [{
        color:       Colors.PRIMARY,
        title:       `📊 ${question}`,
        description: optionLines,
        footer: {
          text: `Sondage par ${interaction.user.tag} • Se termine le ${endsAtDate} à ${endsAtStr}`,
        },
        timestamp: new Date().toISOString(),
      }],
    });

    const pollMessage = await interaction.fetchReply();

    // Ajoute les réactions dans l'ordre
    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(OPTION_EMOJIS[i]).catch(() => {});
    }

    logger.info(`[POLL] "${question}" lancé par ${interaction.user.tag} — durée: ${durationKey}`);

    // Fermeture automatique du sondage
    setTimeout(async () => {
      try {
        // Recharge le message pour avoir les réactions à jour
        const updated = await pollMessage.fetch().catch(() => null);
        if (!updated) return;

        // Compile les résultats
        const results = options.map((opt, i) => {
          const reaction = updated.reactions.cache.get(OPTION_EMOJIS[i]);
          const votes    = reaction ? reaction.count - 1 : 0; // -1 pour le bot lui-même
          return { opt, votes, emoji: OPTION_EMOJIS[i] };
        });

        const totalVotes  = results.reduce((s, r) => s + r.votes, 0);
        const winner      = results.reduce((a, b) => (b.votes > a.votes ? b : a));
        const resultLines = results.map(r => {
          const pct  = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
          const bar  = buildBar(pct);
          return `${r.emoji} **${r.opt}** — ${r.votes} vote(s) (${pct}%)\n${bar}`;
        }).join('\n\n');

        await updated.edit({
          embeds: [{
            color:       Colors.GOLD,
            title:       `📊 [TERMINÉ] ${question}`,
            description: resultLines,
            fields: [
              { name: '🏆 Résultat', value: `**${winner.opt}** avec ${winner.votes} vote(s)` },
              { name: '📈 Total',    value: `${totalVotes} vote(s)` },
            ],
            footer:    { text: `Sondage clôturé par ${interaction.user.tag}` },
            timestamp: new Date().toISOString(),
          }],
        }).catch(() => {});

        logger.info(`[POLL] "${question}" terminé — gagnant: ${winner.opt} (${winner.votes} votes)`);
      } catch (err) {
        logger.error('poll timer error:', err);
      }
    }, durationMs);
  },
};

/** Barre de progression ASCII (10 blocs). */
function buildBar(pct) {
  const filled = Math.round(pct / 10);
  return '`' + '█'.repeat(filled) + '░'.repeat(10 - filled) + '`';
}
