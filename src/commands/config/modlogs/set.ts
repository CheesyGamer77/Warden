import { CommandInteraction, GuildTextBasedChannel, MessageEmbed } from 'discord.js';
import ModlogsGroup from '.';
import { Subcommand } from '../../../util/commands/slash';
import { ChannelType } from 'discord-api-types/v10';
import LoggingModule, { LogEventType } from '../../../modules/logging/LoggingModule';
import { LogConfig } from '@prisma/client';

export default class SetCommand extends Subcommand {
    constructor() {
        super('set', 'Configure moderation logs');
        this.dataBuilder
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

    override async invoke(interaction: CommandInteraction) {
        if (interaction.guild == null) { return; }

        const opts = interaction.options;

        const modlogType = opts.getString('type', true);
        const channel = opts.getChannel('channel', false) as GuildTextBasedChannel | null;

        const content = '';

        const config = await LoggingModule.retrieveConfiguration(interaction.guild);
        const oldChannelId = config[modlogType as keyof LogConfig];

        await LoggingModule.setLogChannel(interaction.guild, modlogType.replace('ChannelId', '') as LogEventType, channel);

        const NOT_SET = '[NOT SET]';
        const embed = new MessageEmbed()
            .setDescription(`Set logging channel for \`${modlogType}\` to ${channel?.toString() ?? NOT_SET}`)
            .setColor('BLURPLE')
            .addFields(
                {
                    name: 'Before',
                    value: oldChannelId != null ? `<#${oldChannelId}> (id: \`${oldChannelId}\`)` : NOT_SET,
                },
                {
                    name: 'After',
                    value: channel != null ? `${channel.toString()} (id: \`${channel.id}\`)` : NOT_SET
                }
            );

        await interaction.reply({
            content: content != '' ? content : null,
            embeds: [ embed ]
        });
    }

}
