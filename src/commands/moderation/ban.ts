import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';

export default class BanCommand extends PermissionLockedSlashCommand {
    constructor() {
        super('ban', 'Bans a member from the server', PermissionFlagsBits.BanMembers);

        this.data
            .addUserOption(option => option
                .setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('The reason behind banning the user')
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
            await guild.bans.create(target, {
                reason: reason
            });

            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.ban.success', {
                        lng: lng,
                        emoji: ':white_check_mark:',
                        userMention: targetMention
                    }))
                    .setColor('Green')
                ]
            });

            await LoggingModule.createActionLog({
                actionType: 'BAN',
                guild: guild,
                target: target,
                moderator: interaction.member,
                reason: reason
            });
        }
        else {
            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.ban.fail.unknown', {
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
