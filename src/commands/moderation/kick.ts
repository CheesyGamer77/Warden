import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { canModerate } from '../../util/checks';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';

export default class KickCommand extends PermissionLockedSlashCommand {
    constructor() {
        super('kick', 'Kicks a member from the server', PermissionFlagsBits.KickMembers);

        this.data
            .addUserOption(option => option
                .setName('member')
                .setDescription('The member to kick')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('The reason behind kicking the member')
                .setRequired(false)
            );
    }

    protected override botHasPermissions(interaction: ChatInputCommandInteraction) {
        return interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.KickMembers) ?? false;
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        if (guild == null || interaction.member == null) return;

        const target = interaction.options.getMember('member') as GuildMember;
        const reason = interaction.options.getString('reason', false) ?? 'No Reason Provided';

        const lng = guild.preferredLocale;
        const targetMention = target.toString();

        if (canModerate(guild.members.me, target) && this.botHasPermissions(interaction)) {
            await target.kick(reason);

            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.kick.success', {
                        lng: lng,
                        emoji: ':white_check_mark:',
                        userMention: targetMention
                    }))
                    .setColor('Green')
                ]
            });

            await LoggingModule.createActionLog({
                actionType: 'KICK',
                guild: guild,
                target: target.user,
                moderator: interaction.member,
                reason: reason
            });
        }
        else {
            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.kick.fail.unknown', {
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
