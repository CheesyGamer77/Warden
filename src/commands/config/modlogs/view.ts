import { LogConfig } from '@prisma/client';
import { ColorResolvable, CommandInteraction, MessageEmbed } from 'discord.js';
import ModlogsGroup from '.';
import LoggingModule from '../../../modules/logging/LoggingModule';
import { Subcommand } from '../../../util/commands/slash';

export default class ViewCommand extends Subcommand {
    constructor() {
        super('view', 'View moderation log configuration');
        this.dataBuilder
            .addStringOption(option => option
                .setName('type')
                .setDescription('The type of moderation log event to view the configured channel for')
                .setRequired(true)
                .addChoices(...ModlogsGroup.logTypeChoices)
            );
    }

    override async invoke(interaction: CommandInteraction) {
        if (interaction.guild == null) { return; }

        const modlogType = interaction.options.getString('type');

        let content = '';

        const config = await LoggingModule.retrieveConfiguration(interaction.guild);

        // display config
        let description = '';
        for (const key in config) {
            if (key == 'guildId') { continue; }
            const channelId = config[key as keyof LogConfig];
            const channelMention = channelId != null ? `<#${channelId}>` : '[NOT SET]';

            description = description.concat(`• \`${key}\`: ${channelMention}\n`);
        }

        let embed: MessageEmbed;
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

        await interaction.reply({
            content: content != '' ? content : null,
            embeds: [ embed ]
        });
    }
}
