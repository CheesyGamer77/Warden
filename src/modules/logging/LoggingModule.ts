import { PrismaClient, LogConfig } from '@prisma/client';
import { Guild, Formatters, GuildMember, Message, PartialMessage, GuildTextBasedChannel, ChannelType } from 'discord.js';
import { canMessage } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import ExpiryMap from 'expiry-map';
import i18next from 'i18next';
import Duration from '../../util/duration';
import { APIInteractionGuildMember } from 'discord-api-types/v10';

const prisma = new PrismaClient();

export type LogEventType = 'modActions' | 'joins' | 'leaves' | 'userFilter' | 'userChanges' | 'textFilter' | 'escalations' | 'messageEdits' | 'messageDeletes' | 'voiceEvents' | 'threadEvents';

interface LogMemberTimeoutOptions {
    target: GuildMember;
    moderator: GuildMember;
    reason: string;
    until: number;
    channelType: 'escalations';
}

export default class LoggingModule extends null {
    private static configCache: ExpiryMap<string, LogConfig> = new ExpiryMap(Duration.ofMinutes(15).toMilliseconds());
    private static caseNumberCache: ExpiryMap<string, number> = new ExpiryMap(Duration.ofMinutes(10).toMilliseconds());

    private static async fetchAndCacheConfiguration(guild: Guild) {
        const data = { guildId: guild.id };
        const config = await prisma.logConfig.upsert({
            where: data,
            update: {},
            create: data
        });

        this.configCache.set(guild.id, config);

        return config;
    }

    /**
     * Retrieves a guild's logging configuration.
     * This returns the cached config entry if found, or query the database for an existing/default configuration otherwise.
     * @param guild The guild to fetch the config of
     * @returns The configuration
     */
    static async retrieveConfiguration(guild: Guild) {
        return this.configCache.get(guild.id) ?? await this.fetchAndCacheConfiguration(guild);
    }

    /**
     * Fetches a guild's log TextChannel of a given event type.
     * If the configuration is cached, this will return the cached entry and not query the database.
     * @param event The type of log event to fetch the log channel of
     * @param guild The guild to fetch the log channel from
     * @returns The TextChannel if it exists, else null
     */
    static async retrieveLogChannel(event: LogEventType, guild: Guild) {
        const config = await this.retrieveConfiguration(guild);

        const channelId = config[event + 'ChannelId' as keyof LogConfig];

        // resolve the said log text channel
        if (channelId != null) {
            const channel = guild.channels.cache.get(channelId) ?? null;

            return canMessage(channel) && channel?.type == ChannelType.GuildText ? channel : null;
        }

        return null;
    }

    /**
     * Configures a guild's log channel for a particular event type.
     * This operation is write-back, meaning this first updates the cache entry (if cached, see below) followed by the database entry.
     * This operation will automatically cache the given configuration by default unless stated otherwise.
     * @param guild The guild to modify the configuration of
     * @param event The event type to set the channel for
     * @param channel The channel to use for logging the aformentioned event, or `null` to un-set
     */
    static async setLogChannel(guild: Guild, event: LogEventType, channel: GuildTextBasedChannel | null) {
        const guildId = guild.id;
        const key = event + 'ChannelId' as keyof Omit<LogConfig, 'guildId'>;
        const newValue = channel?.id ?? null;

        const config = await this.retrieveConfiguration(guild);
        config[key] = newValue;
        this.configCache.set(guildId, config);

        // a bit cursed, but gets the job done :shrug:
        const update = <LogConfig>{};
        update[key] = newValue;
        const create = update;
        create['guildId'] = guildId;

        await prisma.logConfig.upsert({
            where: {
                guildId: guildId
            },
            update: update,
            create: create
        });
    }

    private static async fetchAndCacheNextCaseNumber(guild: Guild) {
        const guildId = guild.id;
        const nextCaseNumber = await prisma.modActions.count({
            where: {
                guildId: guildId
            }
        }) + 1;

        this.caseNumberCache.set(guildId, nextCaseNumber);

        return nextCaseNumber;
    }

    /**
     * Retrieves the next case number for a particular guild.
     * Used when creating new moderation case logs.
     * @param guild The guild to retrieve the next case number for
     */
    private static async retrieveNextCaseNumber(guild: Guild) {
        return this.caseNumberCache.get(guild.id) ?? await this.fetchAndCacheNextCaseNumber(guild);
    }

    static async fetchActionByCaseNumber(guild: Guild, caseNumber: number) {
        return await prisma.modActions.findUnique({
            where: {
                guildId_caseNumber: {
                    guildId: guild.id,
                    caseNumber: caseNumber
                }
            }
        });
    }

    static async createMuteLog(target: GuildMember, moderator: GuildMember | APIInteractionGuildMember, reason: string) {
        const guild = target.guild;
        const lng = guild.preferredLocale;

        const actionLogChannel = await this.retrieveLogChannel('modActions', guild);
        if (actionLogChannel == null) return;

        const caseNumber = await this.retrieveNextCaseNumber(guild);

        await prisma.modActions.create({
            data: {
                guildId: guild.id,
                caseNumber: caseNumber,
                type: 'MUTE',
                offenderId: target.id,
                offenderTag: target.user.tag,
                moderatorId: moderator.user.id,
                moderatorTag: `${moderator.user.username}#${moderator.user.discriminator}`,
                reason: reason
            }
        });

        // increment next case number
        this.caseNumberCache.set(guild.id, caseNumber + 1);

        const actionType = 'Mute';
        const targetId = target.id;
        const targetMention = target.toString();
        const moderatorMention = moderator.toString();

        await actionLogChannel.send({
            content: targetId,
            embeds: [
                getEmbedWithTarget(target.user, lng)
                    .setTitle(i18next.t('logging.modActions.title', {
                        lng: lng,
                        caseNumber: caseNumber,
                        actionType: actionType
                    }))
                    .setDescription(i18next.t('logging.modActions.description', {
                        lng: lng,
                        targetMention: targetMention,
                        actionType: 'muted',
                        moderatorMention: moderatorMention
                    }))
                    .setColor('Gold')
                    .addFields(
                        {
                            name: i18next.t('logging.modActions.fields.member.name', { lng: lng }),
                            value: i18next.t('logging.modActions.fields.member.value', {
                                lng: lng,
                                memberMention: targetMention,
                                memberId: target.id
                            })
                        },
                        {
                            name: i18next.t('logging.modActions.fields.moderator.name', { lng: lng }),
                            value: i18next.t('logging.modActions.fields.moderator.value', {
                                lng: lng,
                                moderatorMention: moderatorMention,
                                moderatorId: moderator.user.id
                            })
                        },
                        {
                            name: i18next.t('logging.modActions.fields.reason.name', { lng: lng }),
                            value: reason
                        }
                    )
            ]
        });
    }

    static async logMemberSpamming(message: Message) {
        if (message.guild == null) return;

        const channel = await this.retrieveLogChannel('textFilter', message.guild);
        const lng = message.guild.preferredLocale;

        const user = message.author;

        const embed = getEmbedWithTarget(user, lng)
            .setTitle(i18next.t('logging.automod.antispam.filtered.title', { lng: lng }))
            .setDescription(i18next.t('logging.automod.antispam.filtered.description', {
                lng: lng,
                userMention: user.toString(),
                channelMention: message.channel.toString()
            }))
            .setColor('Blue');

        // splitting code below modified from https://stackoverflow.com/a/58204391
        const parts = message.content.match(/\b[\w\s]{2000,}?(?=\s)|.+$/g) ?? [ message.content ];
        for (const part of parts) {
            embed.addFields([{
                name: i18next.t('logging.automod.antispam.filtered.fields.message.name', { lng: lng }),
                value: part.trim()
            }]);
        }

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberTimeout(opts: LogMemberTimeoutOptions) {
        const target = opts.target;
        const until = new Date(opts.until);

        const channel = await this.retrieveLogChannel(opts.channelType, target.guild);
        const lng = target.guild.preferredLocale;

        const embed = getEmbedWithTarget(target.user, lng)
            .setTitle(i18next.t('logging.automod.antispam.timeout.title', { lng: lng }))
            .setDescription(i18next.t('logging.automod.antispam.timeout.description', {
                lng: lng,
                userMention: target.user.toString(),
                untilTimeMentionLong: Formatters.time(until, 'F'),
                untilTimeMentionRelative: Formatters.time(until, 'R')
            }))
            .setColor('Orange');

        const mod = opts.moderator;
        if (mod != undefined) {
            embed.addFields([{
                name: i18next.t('logging.automod.antispam.timeout.fields.moderator.name', { lng: lng }),
                value: `${mod.toString()} \`(${mod.id})\``
            }]);
        }

        embed.addFields([{
            name: i18next.t('logging.automod.antispam.timeout.fields.reason.name', { lng: lng }),
            value: opts.reason ?? i18next.t('logging.automod.antispam.timeout.fields.reason.noneGiven', { lng: lng })
        }]);

        await channel?.send({
            content: target.id,
            embeds: [ embed ],
        });

        await this.createMuteLog(target, mod, opts.reason);
    }

    static async logMessageEdit(before: Message | PartialMessage, after: Message) {
        if (after.guild === null || before.content == null || after.content == null) { return; }

        const channel = await this.retrieveLogChannel('messageEdits', after.guild);
        const lng = after.guild.preferredLocale;

        const embed = getEmbedWithTarget(after.author, lng)
            .setTitle(i18next.t('logging.messages.edits.title', { lng: lng }))
            .setDescription(i18next.t('logging.messages.edits.description', {
                lng: lng,
                messageURL: after.url,
                userMention: after.author.toString(),
                channelMention: after.channel.toString()
            }))
            .setColor('Yellow')
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
        if (message.guild == null || message.content == '') { return; }

        const channel = await this.retrieveLogChannel('messageDeletes', message.guild);
        const lng = message.guild.preferredLocale;

        const parts = message.content.match(/\b[\w\s]{1024,}?(?=\s)|.+$/g) || [ message.content ];

        const embed = getEmbedWithTarget(message.author, lng)
            .setTitle(i18next.t('logging.messages.deletes.title', { lng: lng }))
            .setDescription(i18next.t('logging.messages.deletes.description', {
                lng: lng,
                userMention: message.author.toString(),
                channelMention: message.channel.toString()
            }))
            .setColor('Red')
            .setFooter({
                text: i18next.t('logging.messages.deletes.footer', {
                    lng: lng,
                    messageId: message.id,
                    userId: message.author.id
                })
            });

        for (const part of parts) {
            embed.addFields([{
                name: i18next.t('logging.messages.deletes.fields.message.name', { lng: lng }),
                value: part
            }]);
        }

        await channel?.send({
            content: message.author.id,
            embeds: [ embed ]
        });
    }
}
