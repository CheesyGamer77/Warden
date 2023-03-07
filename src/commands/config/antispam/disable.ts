import { ChannelType, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import AntiSpamModule from '../../../modules/automod/AntiSpam';
import { Subcommand } from '../../../util/commands/slash';

export default class DisableCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('disable', 'Disables the Antispam');
        this.dataBuilder.addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel to disable the antispam in')
            .addChannelTypes(ChannelType.GuildText)
        );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) return;

        const guild = interaction.guild;
        const lng = guild.preferredLocale;

        await AntiSpamModule.ignoreGuild(guild);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(i18next.t('commands.config.antispam.disable.guild', {
                        lng: lng,
                        emoji: ':white_check_mark:'
                    }))
                    .setColor('Gold')
            ]
        });
    }
}
