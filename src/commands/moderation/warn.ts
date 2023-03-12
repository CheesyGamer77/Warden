import { ChatInputCommandInteraction, DiscordAPIError, EmbedBuilder, GuildMember, PermissionFlagsBits } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../../modules/logging/LoggingModule';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';

export default class WarnCommand extends PermissionLockedSlashCommand {
    constructor() {
        super('warn', 'Warns a member in direct messages', PermissionFlagsBits.ModerateMembers);

        this.data
            .addUserOption(option => option
                .setName('member')
                .setDescription('The member to warn')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('reason')
                .setDescription('The reason behind warning the member')
                .setRequired(false)
            );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        if (guild == null || interaction.member == null) return;

        const lng = guild.preferredLocale;
        const reason = interaction.options.getString('reason') ?? 'No Reason Provided';
        const member = interaction.options.getMember('member') as GuildMember;
        const memberMention = member.toString();

        // try to direct message the user regarding their warning
        const baseEmbed = new EmbedBuilder();
        try {
            await member.send({
                embeds: [ new EmbedBuilder()
                    .setTitle(i18next.t('commands.warn.success.dm.title', { lng: lng }))
                    .setDescription(i18next.t('commands.warn.success.dm.description', {
                        lng: lng,
                        guildName: guild.name
                    }))
                    .setColor('Gold')
                    .addFields([{
                        name: i18next.t('commands.warn.success.dm.fields.reason.name', { lng: lng }),
                        value: reason
                    }])
                ]
            });

            baseEmbed
                .setDescription(i18next.t('commands.warn.success.reply.description', {
                    lng: lng,
                    emoji: ':white_check_mark:',
                    memberMention: memberMention
                }))
                .setColor('Green');
        }
        catch (e) {
            const emoji = ':x:';
            baseEmbed.setColor('Red');

            if (e instanceof DiscordAPIError) {
                // most likely could not dm the said user
                baseEmbed.setDescription(i18next.t('commands.warn.fail.blocked', {
                    lng: lng,
                    emoji: emoji,
                    memberMention: memberMention
                }));
            }
            else {
                // not sure at this point :shrug:
                baseEmbed.setDescription(i18next.t('commands.warn.fail.unknown', {
                    lng: lng,
                    emoji: emoji,
                    memberMention: memberMention
                }));
            }
        }

        await Promise.all([
            LoggingModule.createActionLog({
                actionType: 'WARN',
                guild: guild,
                target: member.user,
                moderator: interaction.member,
                reason: reason
            }),
            interaction.reply({
                embeds: [ baseEmbed ]
            })
        ]);
    }
}
