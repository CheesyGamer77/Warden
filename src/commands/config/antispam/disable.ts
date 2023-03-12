import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, GuildTextBasedChannel } from 'discord.js';
import i18next from 'i18next';
import AntiSpamModule from '../../../modules/automod/AntiSpam';
import { Subcommand } from 'cheesyutils.js';

export default class DisableCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('disable', 'Disables the Antispam');
        this.data.addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel to disable the antispam in')
            .addChannelTypes(ChannelType.GuildText)
        );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) return;

        const guild = interaction.guild;
        const lng = guild.preferredLocale;

        let description = '';
        const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel;

        if (!channel) {
            await AntiSpamModule.ignoreGuild(guild);
            description = i18next.t('commands.config.antispam.disable.guild', {
                lng: lng,
                emoji: ':white_check_mark:'
            });
        }
        else {
            await AntiSpamModule.ignoreChannel(channel);
            description = i18next.t('commands.config.antispam.disable.channel', {
                lng: lng,
                emoji: ':white_check_mark:',
                channelMention: channel.toString()
            });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(description)
                    .setColor('Gold')
            ]
        });
    }
}
