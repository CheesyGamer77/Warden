import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';

export default class UnbanCommand extends PermissionLockedSlashCommand {
    constructor() {
        super('ban', 'Unbans a member from the server', PermissionFlagsBits.BanMembers);

        this.dataBuilder
            .addUserOption(option => option
                .setName('user')
                .setDescription('The user to unban')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('The reason behind unbanning the user')
                .setRequired(false)
            );
    }

    protected override botHasPermissions(interaction: ChatInputCommandInteraction) {
        return interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.BanMembers) ?? false;
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        if (guild == null || interaction.member == null) return;

        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', false) ?? 'No Reason Provided';

        const lng = guild.preferredLocale;
        const targetMention = target.toString();

        if (this.botHasPermissions(interaction)) {
            await guild.bans.remove(target, reason);

            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.unban.success', {
                        lng: lng,
                        emoji: ':white_checkmark:',
                        userMention: targetMention
                    }))
                    .setColor('Green')
                ]
            });

            await LoggingModule.createActionLog({
                actionType: 'UNBAN',
                guild: guild,
                target: target,
                moderator: interaction.member,
                reason: reason
            });
        }
        else {
            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.unban.fail.unknown', {
                        lng: lng,
                        emoji: ':x:',
                        userMention: targetMention
                    }))
                    .setColor('Red')
                ]
            });
        }
    }
}
