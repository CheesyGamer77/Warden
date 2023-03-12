import { ColorResolvable, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import ModlogsGroup, { LogConfigKeys } from '.';
import LoggingModule from '../../../modules/logging/LoggingModule';
import { Subcommand } from 'cheesyutils.js';

export default class ViewCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('view', 'View moderation log configuration');
        this.data
            .addStringOption(option => option
                .setName('type')
                .setDescription('The type of moderation log event to view the configured channel for')
                .setRequired(false)
                .addChoices(...ModlogsGroup.logTypeChoices)
            );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) { return; }

        const guild = interaction.guild;
        const lng = guild.preferredLocale;
        const config = await LoggingModule.retrieveConfiguration(guild);

        let content = '';
        let description = '';

        // hacky way to iterate through each log config key while ignoring 'guildId'
        for (const key in config) {
            if (key == 'guildId') { continue; }
            const channelId = config[key as LogConfigKeys];
            let channelMention;
            if (channelId != null) {
                channelMention = `<#${channelId}>`;
            }
            else {
                channelMention = `[${i18next.t('commands.config.modlogs.common.notSet', { lng: lng })}]`;
            }

            // TODO: still gotta deal with key formatting :shrug: just ignore for now
            description = description.concat(`• \`${key}\`: ${channelMention}\n`);
        }

        let embed: EmbedBuilder;

        const modlogType = interaction.options.getString('type') as LogConfigKeys;
        if (modlogType == null) {
            // display entire config
            embed = new EmbedBuilder()
                .setTitle(i18next.t('commands.config.modlogs.view.full.title', { lng: lng }))
                .setDescription(description)
                .setColor('Blurple')
                .setFooter({ text: i18next.t('commands.config.modlogs.view.full.footer', {
                    lng: lng,
                    guildId: guild.id
                }) });
        }
        else {
            // display channel for given type
            const channelId = config[modlogType];
            let color: ColorResolvable;

            if (channelId != null) {
                description = i18next.t('commands.config.modlogs.view.single.description.set', {
                    lng: lng,
                    type: modlogType,
                    channelMention: `<#${channelId}>`
                });
                color = 'Blurple';
                content = channelId;
            }
            else {
                description = i18next.t('commands.config.modlogs.view.single.description.unset', {
                    lng: lng,
                    type: modlogType
                });
                color = 'Red';
            }

            embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(color);
        }

        await interaction.reply({
            content: content != '' ? content : undefined,
            embeds: [ embed ]
        });
    }
}
