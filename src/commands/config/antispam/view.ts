import { PrismaClient } from '@prisma/client';
import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import AutoMod from '../../../modules/automod';
import { Subcommand } from 'cheesyutils.js';

const prisma = new PrismaClient();

export default class ViewCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('view', 'View antispam configuration');
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const guild = interaction.guild;
        const lng = interaction.locale;

        const title = i18next.t('commands.config.antispam.view.title', {
            lng: lng,
        });

        let description = '';
        let color: ColorResolvable;

        const { antiSpamEnabled } = await AutoMod.retrieveConfig(guild);
        if (!antiSpamEnabled) {
            description = i18next.t('commands.config.antispam.view.description.disabled', {
                lng: lng
            });

            color = 'Red';
        }
        else {
            const ignoredChannelMentions = (await prisma.antiSpamIgnoredChannels.findMany({ where: {
                guildId: guild.id
            } })).map(entry => `• <#${entry.channelId}>`);

            const count = ignoredChannelMentions.length;

            const ignoredChannelMentionsString = count > 0 ? ignoredChannelMentions.join('\n') : '<none>';

            description = i18next.t('commands.config.antispam.view.description.enabled', {
                lng: lng,
                ignoredChannelsCount: count,
                ignoredChannelMentions: ignoredChannelMentionsString
            });

            color = 'Blurple';
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(color)
            ]
        });
    }
}
