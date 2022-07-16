import { CacheType, CommandInteraction, GuildMember, MessageEmbed, Permissions } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';
import Duration from '../../util/duration';

/**
 * `/mute` command - Mutes a user in a guild
 */
export default class MuteCommand extends PermissionLockedSlashCommand {
    constructor() {
        // TODO: Localize command data
        super('mute', 'Prevents a member from speaking temporarily', Permissions.FLAGS.MODERATE_MEMBERS);
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
        return interaction.guild?.me?.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS) ?? false;
    }

    override async invoke(interaction: CommandInteraction) {
        if (interaction.guild == null || interaction.member == null) return;

        const lng = interaction.guild.preferredLocale;

        const member = interaction.options.getMember('member', true) as GuildMember;
        const duration = Duration.ofMinutes(interaction.options.getInteger('minutes', true));
        const reason = interaction.options.getString('reason', false) ?? 'No Reason Provided';

        if (this.botHasPermissions(interaction)) {
            const endTimestamp = Date.now() + duration.toMilliseconds();
            await member.disableCommunicationUntil(endTimestamp, reason);

            await interaction.reply({
                ephemeral: true,
                embeds: [new MessageEmbed()
                    .setDescription(i18next.t('commands.mute.success', {
                        lng: lng,
                        emoji: ':white_check_mark:',
                        userMention: member.toString()
                    }))
                ]
            });

            await LoggingModule.createMuteLog(member, interaction.member, reason);
        }
        else {
            await interaction.reply({
                ephemeral: true,
                embeds: [new MessageEmbed()
                    .setDescription(i18next.t('commands.mute.fail', {
                        lng: lng,
                        emoji: ':x:',
                        userMention: member.toString()
                    }))
                ]
            });
        }
    }
}
