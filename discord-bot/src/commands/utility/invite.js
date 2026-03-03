'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Classement des invitations du serveur'),

    async execute(interaction) {

        const invites = await interaction.guild.invites.fetch();

        const inviteMap = new Map();

        invites.forEach(inv => {
            if (!inv.inviter) return;

            const count = inviteMap.get(inv.inviter.id) || 0;
            inviteMap.set(inv.inviter.id, count + inv.uses);
        });

        const sorted = [...inviteMap.entries()]
            .sort((a, b) => b[1] - a[1]);

        const pageSize = 10;
        let page = 0;

        const generateEmbed = async () => {

            const start = page * pageSize;
            const current = sorted.slice(start, start + pageSize);

            const description = await Promise.all(
                current.map(async ([userId, invites], i) => {

                    const member = await interaction.guild.members.fetch(userId).catch(() => null);

                    const name = member ? member.user.username : "Utilisateur inconnu";

                    return `**${start + i + 1}.** ${name} — **${invites} invites**`;
                })
            );

            return new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🏆 Classement des invitations")
                .setDescription(description.join("\n") || "Aucune donnée.")
                .setFooter({ text: `Page ${page + 1} / ${Math.ceil(sorted.length / pageSize)}` });

        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Secondary)
        );

        const message = await interaction.reply({
            embeds: [await generateEmbed()],
            components: [row],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            time: 120000
        });

        collector.on('collect', async i => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "Tu ne peux pas utiliser ces boutons.", ephemeral: true });
            }

            if (i.customId === 'prev') page--;
            if (i.customId === 'next') page++;

            const maxPage = Math.ceil(sorted.length / pageSize) - 1;

            if (page < 0) page = 0;
            if (page > maxPage) page = maxPage;

            await i.update({
                embeds: [await generateEmbed()]
            });

        });

    }
};