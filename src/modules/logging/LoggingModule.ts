import { PrismaClient, LogConfig, ModActionType } from '@prisma/client';
import { Guild, GuildTextBasedChannel, ChannelType, User } from 'discord.js';
import { canMessage } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import ExpiryMap from 'expiry-map';
import i18next from 'i18next';
import Duration from '../../util/duration';
import { capitalizeFirstLetter, getPastTense } from '../../util/string';

const prisma = new PrismaClient();

export type LogEventType = 'modActions' | 'joins' | 'leaves' | 'userFilter' | 'userChanges' | 'textFilter' | 'escalations' | 'messageEdits' | 'messageDeletes' | 'voiceEvents' | 'threadEvents';

/**
 * Objects containing a `user` property
 */
interface IUser {
    user: {
        id: string
        username: string
        discriminator: string
    }
}

/**
 * Module for logging moderation-related details and updates.
 *
 * A log type without an associated channel will not be utilized in the guild.
 *
 * By default, guilds are assigned an empty configuration. IE, no logging takes place.
 * Log details are not stored outside of Discord.
 */
export default class LoggingModule {
    private static configCache: ExpiryMap<string, LogConfig> = new ExpiryMap(Duration.ofMinutes(15).toMilliseconds());
    private static caseNumberCache: ExpiryMap<string, number> = new ExpiryMap(Duration.ofMinutes(10).toMilliseconds());

    private static _instance: LoggingModule | undefined = undefined;

    /**
     * Returns the current instance of LoggingModule
     */
    public static get instance() {
        if (!this._instance) {
            this._instance = new LoggingModule();
        }

        return this._instance;
    }

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

    /**
     * Creates a new moderator action log.
     * This aborts if there is no action log channel defined for the given guild
     * @param opts The action type, target, moderator, duration (for mutes), and the reason behind the mute
     */
    static async createActionLog(opts: {
        actionType: ModActionType,
        guild: Guild,
        target: User,
        moderator: IUser,
        minutes?: number,
        reason: string
    }) {
        const target = opts.target;
        const moderator = opts.moderator;
        const guild = opts.guild;
        const lng = guild.preferredLocale;

        const actionLogChannel = await this.retrieveLogChannel('modActions', guild);
        if (actionLogChannel == null) return;

        const caseNumber = await this.retrieveNextCaseNumber(guild);

        await prisma.modActions.create({ data: {
            guildId: guild.id,
            caseNumber: caseNumber,
            type: opts.actionType,
            offenderId: target.id,
            offenderTag: target.tag,
            moderatorId: moderator.user.id,
            moderatorTag: `${moderator.user.username}#${moderator.user.discriminator}`,
            reason: opts.reason
        } });

        this.caseNumberCache.set(guild.id, caseNumber + 1);

        const targetMention = target.toString();
        const moderatorMention = moderator.toString();

        const actionType = opts.actionType.toLowerCase();

        await actionLogChannel.send({
            content: target.id,
            embeds: [
                getEmbedWithTarget(target, lng)
                    .setTitle(i18next.t('logging.modActions.title', {
                        lng: lng,
                        caseNumber: caseNumber,
                        actionType: capitalizeFirstLetter(actionType)
                    }))
                    .setDescription(i18next.t('logging.modActions.description', {
                        lng: lng,
                        targetMention: targetMention,
                        actionType: getPastTense(actionType),
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
                            name: i18next.t('logging.modActions.fields.durationMinutes.name', { lng: lng }),
                            value: `${opts.minutes}`
                        },
                        {
                            name: i18next.t('logging.modActions.fields.reason.name', { lng: lng }),
                            value: opts.reason
                        }
                    )
            ]
        });
    }
}
