import { ColorResolvable, CommandInteraction, GuildTextBasedChannel, MessageEmbed } from 'discord.js';
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
        const channel = opts.getChannel('channel', false) as GuildTextBasedChannel;

        let content = '';
        let embed: MessageEmbed;

        const config = await LoggingModule.retrieveConfiguration(interaction.guild);
        if (channel == null) {
            // display config
            let description = '';
            for (const key in config) {
                if (key == 'guildId') { continue; }
                const channelId = config[key as keyof LogConfig];
                const channelMention = channelId != null ? `<#${channelId}>` : '[NOT SET]';

                description = description.concat(`• \`${key}\`: ${channelMention}\n`);
            }

            if (modlogType == null) {
                // display entire config
                embed = new MessageEmbed()
                    .setTitle('Moderation Log Configuration')
                    .setDescription(description)
                    .setColor('BLURPLE')
                    .setFooter({ text: `Guild ID: ${interaction.guildId}` });
            }
            else {
                // display channel for given type
                const channelId = config[modlogType as keyof LogConfig];
                let color: ColorResolvable;

                if (channelId != null) {
                    description = `Logs for \`${modlogType}\` are currently sent to <#${channelId}>`;
                    color = 'BLURPLE';
                    content = channelId;
                }
                else {
                    description = `There is no channel set for logging \`${modlogType}\``;
                    color = 'RED';
                }

                embed = new MessageEmbed()
                    .setDescription(description)
                    .setColor(color);
            }
        }
        else {
            // save old channel for feedback message
            const oldChannelId = config[modlogType as keyof LogConfig];

            // set modlog channel
            await LoggingModule.setLogChannel(modlogType.replace('ChannelId', '') as LogEventType, channel);

            embed = new MessageEmbed()
                .setDescription(`Set logging channel for \`${modlogType}\` to ${channel.toString()}`)
                .addFields(
                    {
                        name: 'Before',
                        value: `<#${oldChannelId}> (id: \`${oldChannelId}\`)`,
                    },
                    {
                        name: 'After',
                        value: `${channel.toString()} (id: \`${channel.id}\`)`
                    }
                );
        }

        await interaction.reply({
            content: content != '' ? content : null,
            embeds: [ embed ]
        });
    }

}
