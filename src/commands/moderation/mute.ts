import { CacheType, CommandInteraction, GuildMember, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { canModerate } from '../../util/checks';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';
import Duration from '../../util/duration';

/**
 * `/mute` command - Mutes a user in a guild
 */
export default class MuteCommand extends PermissionLockedSlashCommand {
    constructor() {
        // TODO: Localize command data
        super('mute', 'Prevents a member from speaking temporarily', PermissionFlagsBits.ModerateMembers);
        this.dataBuilder
            .addUserOption(option => option
                .setName('member')
                .setDescription('The member to mute')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('minutes')
                .setDescription('The number of minutes to mute the member for')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(Duration.ofDays(28).toMinutes())
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('The reason behind muting the member')
                .setRequired(false)
                .setMaxLength(1024)
            );
    }

    protected override botHasPermissions(interaction: CommandInteraction<CacheType>): boolean {
        return interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers) ?? false;
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        if (guild == null || interaction.member == null) return;

        const lng = guild.preferredLocale;

        const member = interaction.options.getMember('member') as GuildMember;
        const duration = Duration.ofMinutes(interaction.options.getInteger('minutes', true));
        const reason = interaction.options.getString('reason', false) ?? 'No Reason Provided';

        if (canModerate(guild.members.me, member) && this.botHasPermissions(interaction)) {

            if (!member.isCommunicationDisabled()) {
                const endTimestamp = Date.now() + duration.toMilliseconds();
                await member.disableCommunicationUntil(endTimestamp, reason);

                await interaction.reply({
                    ephemeral: true,
                    embeds: [new EmbedBuilder()
                        .setDescription(i18next.t('commands.mute.success', {
                            lng: lng,
                            emoji: ':white_check_mark:',
                            userMention: member.toString()
                        }))
                        .setColor('Green')
                    ]
                });

                await LoggingModule.createMuteLog(member, interaction.member, duration.toMinutes(), reason);
            }
            else {
                // member already muted
                await interaction.reply({
                    ephemeral: true,
                    embeds: [new EmbedBuilder()
                        .setDescription(i18next.t('commands.mute.fail.alreadyTimedout', {
                            lng: lng,
                            emoji: ':x:',
                            userMention: member.toString()
                        }))
                        .setColor('Red')
                    ]
                });
            }
        }
        else {
            await interaction.reply({
                ephemeral: true,
                embeds: [new EmbedBuilder()
                    .setDescription(i18next.t('commands.mute.fail.unknown', {
                        lng: lng,
                        emoji: ':x:',
                        userMention: member.toString()
                    }))
                    .setColor('Red')
                ]
            });
        }
    }
}
