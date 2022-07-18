import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import NameSanitizerModule from '../../../modules/automod/NameSanitizer';
import { Subcommand } from '../../../util/commands/slash';

export default class DisableCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('disable', 'Disables the Name Sanitizer');
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) return;

        const guild = interaction.guild;
        const lng = guild.preferredLocale;

        await NameSanitizerModule.setEnabled(guild, false);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(i18next.t('commands.config.nameSanitizer.disable', {
                        lng: lng,
                        emoji: ':white_check_mark:'
                    }))
                    .setColor('Gold')
            ]
        });
    }
}
