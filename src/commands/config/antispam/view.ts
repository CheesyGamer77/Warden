import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import { Subcommand } from 'cheesyutils.js';
import AntiSpamModule from '../../../modules/automod/AntiSpam';

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

        const config = await AntiSpamModule.instance.retrieveConfig(guild);
        if (!config.enabled) {
            description = i18next.t('commands.config.antispam.view.description.disabled', {
                lng: lng
            });

            color = 'Red';
        }
        else {
            const ignoredChannelMentions = config.ignoredChannels.map(entry => `• <#${entry.channelId}>`).join('\n');

            const count = ignoredChannelMentions.length;

            // TODO: Localize '<none>'
            description = i18next.t('commands.config.antispam.view.description.enabled', {
                lng: lng,
                ignoredChannelsCount: count,
                ignoredChannelMentions: count > 0 ? ignoredChannelMentions : '<none>'
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
