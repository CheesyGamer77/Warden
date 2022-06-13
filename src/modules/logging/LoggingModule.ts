import { PrismaClient, LogConfig } from '@prisma/client';
import { Guild, TextChannel, Formatters, GuildMember, PartialGuildMember, Message, PartialMessage } from 'discord.js';
import { canMessage } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import ExpiryMap from 'expiry-map';
import i18next from 'i18next';

const prisma = new PrismaClient();

export type LogEventType = 'joins' | 'leaves' | 'userFilter' | 'userChanges' | 'textFilter' | 'escalations' | 'messageEdits' | 'messageDeletes' | 'voiceEvents' | 'threadEvents';

interface LogMemberTimeoutOptions {
    target: GuildMember;
    moderator: GuildMember | undefined;
    reason: string | undefined;
    until: number;
    channelType: 'escalations';
}

export default class LoggingModule {
    private static configCache: ExpiryMap<string, LogConfig> = new ExpiryMap(15 * 1000 * 60);

    private static async createBlankLogConfiguration(guild: Guild): Promise<LogConfig> {
        const data = await prisma.logConfig.create({
            data: {
                guildId: guild.id,
            },
        });

        this.configCache.set(guild.id, data);

        return data;
    }

    /**
     * Fetches a guild's logging configuration.
     *
     * This will create a new blank configuration in the event that the config is not found.
     * @param guild The guild to fetch the config of
     * @returns The configuration
     */
    static async fetchLogConfiguration(guild: Guild): Promise<LogConfig> {
        const data = this.configCache.get(guild.id) ?? await prisma.logConfig.findUnique({
            where: {
                guildId: guild.id,
            },
        });

        // fallback to new blank config if not found in cache or db
        return data != null ? data : await this.createBlankLogConfiguration(guild);
    }

    /**
     * Fetches a guild's log TextChannel of a given event type
     * @param event The type of log event to fetch the log channel of
     * @param guild The guild to fetch the log channel from
     * @returns The TextChannel if it exists, else null
     */
    static async fetchLogChannel(event: LogEventType, guild: Guild): Promise<TextChannel | null> {
        const config = await this.fetchLogConfiguration(guild);

        const channelId = config[event + 'ChannelId' as keyof LogConfig];

        // resolve the said log text channel
        if (channelId != null) {
            const channel = guild.channels.cache.get(channelId) ?? null;

            return canMessage(channel) && channel?.type == 'GUILD_TEXT' ? channel : null;
        }

        return null;
    }

    static async logMemberJoined(member: GuildMember) {
        const channel = await this.fetchLogChannel('joins', member.guild);
        const lng = member.guild.preferredLocale;

        const user = member.user;

        const embed = getEmbedWithTarget(user, lng)
            .setTitle(i18next.t('logging.joins.title', { lng: lng }))
            .setDescription(i18next.t('logging.joins.description', {
                lng: lng,
                userMention: user.toString()
            }))
            .setColor('GREEN')
            .addField(
                i18next.t('logging.joins.fields.accountCreated.name', { lng: lng }),
                Formatters.time(user.createdAt, 'R')
            );

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberLeft(member: GuildMember | PartialGuildMember) {
        const channel = await this.fetchLogChannel('leaves', member.guild);
        const lng = member.guild.preferredLocale;

        const user = member.user;

        const embed = getEmbedWithTarget(user, lng)
            .setTitle(i18next.t('logging.leaves.title', { lng: lng }))
            .setDescription(i18next.t('logging.leaves.description', {
                lng: lng,
                userMention: user.toString()
            }))
            .setColor('RED');

        // a removed member's joined at timestamp has the potential to be null
        let memberSince: string;
        if (member.joinedAt != null) {memberSince = Formatters.time(member.joinedAt, 'R');}
        else {memberSince = i18next.t('logging.leaves.fields.memberSince.unknown');}

        embed.addField(
            i18next.t('logging.leaves.fields.memberSince.name'),
            memberSince
        );

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberSpamming(message: Message) {
        if (message.guild == null) return;

        const channel = await this.fetchLogChannel('textFilter', message.guild);
        const lng = message.guild.preferredLocale;

        const user = message.author;

        const embed = getEmbedWithTarget(user, lng)
            .setTitle(i18next.t('logging.automod.antispam.filtered.title', { lng: lng }))
            .setDescription(i18next.t('logging.automod.antispam.filtered.description', {
                lng: lng,
                userMention: user.toString(),
                channelMention: message.channel.toString()
            }))
            .setColor('BLUE');

        // splitting code below taken from https://stackoverflow.com/a/58204391
        const parts = message.content.match(/\b[\w\s]{2000,}?(?=\s)|.+$/g) ?? [ message.content ];
        for (const part of parts) {
            embed.addField(
                i18next.t('logging.automod.antispam.filtered.fields.message.name', { lng: lng }),
                part.trim()
            );
        }

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberTimeout(opts: LogMemberTimeoutOptions) {
        const target = opts.target;
        const until = new Date(opts.until);

        const channel = await this.fetchLogChannel(opts.channelType, target.guild);
        const lng = target.guild.preferredLocale;

        const embed = getEmbedWithTarget(target.user, lng)
            .setTitle(i18next.t('logging.automod.antispam.timeout.title', { lng: lng }))
            .setDescription(i18next.t('logging.automod.antispam.timeout.description', {
                lng: lng,
                userMention: target.user.toString(),
                untilTimeMentionLong: Formatters.time(until, 'F'),
                untilTimeMentionRelative: Formatters.time(until, 'R')
            }))
            .setColor('ORANGE');

        const mod = opts.moderator;
        if (mod != undefined) {
            embed.addField(
                i18next.t('logging.automod.antispam.timeout.fields.moderator.name', { lng: lng }),
                `${mod.toString()} \`(${mod.id})\``
            );
        }

        embed.addField(
            i18next.t('logging.automod.antispam.timeout.fields.reason.name', { lng: lng }),
            opts.reason ?? i18next.t('logging.automod.antispam.timeout.fields.reason.noneGiven', { lng: lng })
        );

        await channel?.send({
            content: target.id,
            embeds: [ embed ],
        });
    }

    static async logMessageEdit(before: Message | PartialMessage, after: Message) {
        if (after.guild === null || before.content == null || after.content == null) { return; }

        const channel = await this.fetchLogChannel('messageEdits', after.guild);
        const lng = after.guild.preferredLocale;

        const embed = getEmbedWithTarget(after.author, lng)
            .setTitle(i18next.t('logging.messages.edits.title', { lng: lng }))
            .setDescription(i18next.t('logging.messages.edits.description', {
                lng: lng,
                messageURL: after.url,
                userMention: after.author.toString(),
                channelMention: after.channel.toString()
            }))
            .setColor('YELLOW')
            .addFields([
                {
                    name: i18next.t('logging.messages.edits.fields.before.name', { lng: lng }),
                    value: before.content
                },
                {
                    name: i18next.t('logging.messages.edits.fields.after.name', { lng: lng }),
                    value: after.content
                }
            ])
            .setFooter({
                text: i18next.t('logging.messages.edits.footer', {
                    lng: lng,
                    messageId: after.id,
                    userId: after.author.id
                })
            });

        await channel?.send({
            content: after.author.id,
            embeds: [ embed ]
        });
    }

    static async logMessageDelete(message: Message) {
        if (message.guild == null || message.content == null) { return; }

        const channel = await this.fetchLogChannel('messageDeletes', message.guild);
        const lng = message.guild.preferredLocale;

        const parts = message.content.match(/\b[\w\s]{1024,}?(?=\s)|.+$/g) || [ message.content ];

        const embed = getEmbedWithTarget(message.author, lng)
            .setTitle(i18next.t('logging.messages.deletes.title', { lng: lng }))
            .setDescription(i18next.t('logging.messages.deletes.description', {
                lng: lng,
                userMention: message.author.toString(),
                channelMention: message.channel.toString()
            }))
            .setColor('RED')
            .setFooter({
                text: i18next.t('logging.messages.deletes.footer', {
                    lng: lng,
                    messageId: message.id,
                    userId: message.author.id
                })
            });

        for (const part of parts) {
            embed.addField(
                i18next.t('logging.messages.deletes.fields.message.name', { lng: lng }),
                part
            );
        }

        await channel?.send({
            content: message.author.id,
            embeds: [ embed ]
        });
    }
}
