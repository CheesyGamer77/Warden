import { ChannelType, ChatInputCommandInteraction, GuildTextBasedChannel, EmbedBuilder } from 'discord.js';
import ModlogsGroup, { LogConfigKeys } from '.';
import { Subcommand } from 'cheesyutils.js';
import LoggingModule, { LogEventType } from '../../../modules/logging/LoggingModule';
import i18next from 'i18next';

export default class SetCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('set', 'Configure moderation logs');
        this.data
            .addStringOption(option => option
                .setName('type')
                .setDescription('The type of moderation log to set the configured channel of')
                .setRequired(true)
                .addChoices(...ModlogsGroup.logTypeChoices)
            )
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('The channel to set for the given log type, leave blank to un-set')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
            );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) { return; }

        const lng = interaction.guild.preferredLocale;
        const opts = interaction.options;

        const modlogType = opts.getString('type', true);
        const channel = opts.getChannel('channel', false) as GuildTextBasedChannel | null;

        const config = await LoggingModule.instance.retrieveConfig(interaction.guild);
        const oldChannelId = config[modlogType as LogConfigKeys];

        await LoggingModule.instance.setLogChannel(interaction.guild, modlogType.replace('ChannelId', '') as LogEventType, channel);

        const NOT_SET = i18next.t('commands.config.modlogs.common.notSet');
        const embed = new EmbedBuilder()
            .setDescription(i18next.t('commands.config.modlogs.set.description', {
                lng: lng,
                type: modlogType,
                value: channel?.toString() ?? NOT_SET
            }))
            .setColor('Blurple')
            .addFields(
                {
                    name: i18next.t('commands.config.modlogs.set.fields.before.name', { lng: lng }),
                    value: oldChannelId != null ? `<#${oldChannelId}> (id: \`${oldChannelId}\`)` : NOT_SET,
                },
                {
                    name: i18next.t('commands.config.modlogs.set.fields.after.name', { lng: lng }),
                    value: channel != null ? `${channel.toString()} (id: \`${channel.id}\`)` : NOT_SET
                }
            );

        await interaction.reply({
            embeds: [ embed ]
        });
    }

}
