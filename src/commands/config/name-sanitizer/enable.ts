import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import NameSanitizerModule from '../../../modules/automod/NameSanitizer';
import { Subcommand } from 'cheesyutils.js';

export default class EnableCommand extends Subcommand {
    // TODO: Localize command data
    constructor() {
        super('enable', 'Enables the Name Sanitizer');
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        if (interaction.guild == null) return;

        const guild = interaction.guild;
        const lng = guild.preferredLocale;

        await NameSanitizerModule.instance.setEnabled(guild, true);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(i18next.t('commands.config.nameSanitizer.enable', {
                        lng: lng,
                        emoji: ':white_check_mark:'
                    }))
                    .setColor('Green')
            ]
        });
    }
}
