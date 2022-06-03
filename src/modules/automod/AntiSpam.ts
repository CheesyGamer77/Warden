import { Guild, GuildMember, Message, Permissions, TextChannel, ThreadChannel } from 'discord.js';
import { createHash } from 'crypto';
import { canDelete } from '../../util/checks';
import LoggingModule from '../logging/LoggingModule';
import ExpiryMap from 'expiry-map';
import UserReputation from './UserReputation';
import { AutoModConfig, PrismaClient } from '@prisma/client';

interface MessageReference {
    readonly guildId: string;
    readonly channelId: string;
    readonly id: string;
    readonly createdAt: number;
}

interface AntiSpamEntry {
    count: number;
    hash: string;
    references: MessageReference[]
}

type IgnorableChannel = TextChannel | ThreadChannel;

const prisma = new PrismaClient();

export default class AntiSpamModule {
    private static readonly ONE_MINUTE = 60 * 1000;
    private static readonly THIRTY_MINUTES = 30 * 60 * 1000;

    private static entryCache: ExpiryMap<string, AntiSpamEntry> = new ExpiryMap(this.ONE_MINUTE);
    private static ignoredEntitiesCache: ExpiryMap<string, Set<string>> = new ExpiryMap(this.THIRTY_MINUTES);

    // TODO: Doesn't really belong here. Should be up one level in the heirarchy.
    private static automodConfigCache: ExpiryMap<string, AutoModConfig> = new ExpiryMap(this.THIRTY_MINUTES);

    private static getContentHash(message: Message) {
        return createHash('md5').update(message.content.toLowerCase()).digest('hex');
    }

    private static getSpamKey(message: Message) {
        return `${message.guildId}:${message.author.id}:${this.getContentHash(message)}`;
    }

    private static getMessageReference(message: Message): MessageReference {
        if (message.guildId == null) throw new Error('Message References must have a non-null guild id');

        return {
            guildId: message.guildId,
            channelId: message.channelId,
            id: message.id,
            createdAt: message.createdTimestamp,
        };
    }

    private static setAndGetEntry(message: Message): AntiSpamEntry {
        const key = this.getSpamKey(message);

        const entry = this.entryCache.get(key) ?? {
            count: 0,
            hash: this.getContentHash(message),
            references: [ this.getMessageReference(message) ],
        };

        entry.count += 1;
        this.entryCache.set(key, entry);

        return entry;
    }

    private static async deleteSpamMessage(message: Message) {
        if (message.member == null) return;

        const deletedMessage = await message.delete();
        await LoggingModule.logMemberSpamming(deletedMessage);
        await UserReputation.modifyReputation(message.member, -0.2);
    }

    private static async timeoutMember(member: GuildMember, instances: number) {
        if (member.guild.me == null) return;

        const reason = `Spamming (${instances} instances)`;
        const until = Date.now() + (60 * 1000);

        await member.disableCommunicationUntil(until, reason);
        await LoggingModule.logMemberTimeout({
            target: member,
            moderator: member.guild.me,
            reason: reason,
            until: until,
            channelType: 'escalations',
        });

        await UserReputation.modifyReputation(member, -0.3);
    }

    private static async fetchAutomodConfig(guild: Guild): Promise<AutoModConfig> {
        const guildId = guild.id;
        return this.automodConfigCache.get(guildId) ?? await prisma.autoModConfig.upsert({
            where: {
                guildId: guildId
            },
            update: {},
            create: {
                guildId: guildId,
                antiSpamEnabled: false
            }
        });
    }

    private static async setAntiSpamEnabled(guild: Guild, enabled: boolean) {
        const guildId = guild.id;

        await prisma.autoModConfig.upsert({
            where: {
                guildId: guildId
            },
            update: {
                antiSpamEnabled: enabled
            },
            create: {
                guildId: guildId,
                antiSpamEnabled: false
            }
        });

        const cache = await this.fetchAutomodConfig(guild);
        cache.antiSpamEnabled = enabled;
        this.automodConfigCache.set(guildId, cache);
    }

    private static async channelIsIgnored(channel: IgnorableChannel) {
        const guildId = channel.guildId;

        let ignored = this.ignoredEntitiesCache.has(channel.id);
        if(ignored !== undefined) return ignored;

        const data = await prisma.antiSpamIgnoredChannels.findUnique({
            where: {
                guildId_channelId: {
                    guildId: channel.guildId,
                    channelId: channel.id
                }
            }
        });

        return data !== undefined;
    }

    /**
     * Disables the anti-spam for a particular guild.
     * This automatically updates the automod config cache respectively.
     * @param guild The guild to disable the anti-spam for
     */
    static async ignoreGuild(guild: Guild) {
        await this.setAntiSpamEnabled(guild, false);
    }

    /**
     * Enables the anti-spam for a particular guild.
     * This automatically updates the automod config cache respectively.
     * @param guild The guild to enable the anti-spam for
     */
    static async unignoreGuild(guild: Guild) {
        await this.setAntiSpamEnabled(guild, true);
    }

    /**
     * Sets a text channel to be ignored by the anti-spam.
     * This automatically adds the entry to the anti-spam's ignored channels cache.
     * @param channel The channel to ignore
     */
    static async ignoreChannel(channel: IgnorableChannel) {
        const channelId = channel.id;
        const guildId = channel.guildId;

        await prisma.antiSpamIgnoredChannels.create({
            data: {
                guildId: guildId,
                channelId: channelId
            }
        });
    }

    /**
     * Sets a text channel to be moderated by the anti-spam again (assuming it's enabled for the guild).
     * This automatically modifies the anti-spam's ignored channels cache appropriately.
     * @param channel
     */
    static async unIgnoreChannel(channel: IgnorableChannel) {
        const channelId = channel.id;
        const guildId = channel.guildId;

        await prisma.antiSpamIgnoredChannels.delete({
            where: {
                guildId_channelId: {
                    guildId: guildId,
                    channelId: channelId
                }
            }
        });
    }

    static async process(message: Message) {
        const channel = message.channel;
        const member = message.member;

        // ignore if the antispam is disabled for the guild
        const guild = message.guild;
        if(guild != null && !(await this.fetchAutomodConfig(guild)).antiSpamEnabled) return;

        // ignore DM and news channels, non-guild messages, and messages with a null member author
        if (channel.type == 'DM' || channel.type == 'GUILD_NEWS' || member == null) return;

        // ignore bots and members with manage message perms
        if (member.user.bot || member.permissionsIn(channel).has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        // ignore if the message is from an ignored channel
        if(await this.channelIsIgnored(channel)) return;

        // get and handle antispam entry
        const entry = this.setAndGetEntry(message);
        const count = entry.count;

        if (count >= 3 && canDelete(message)) {
            await this.deleteSpamMessage(message);
            if (count >= 5) {
                if (member.moderatable) {await this.timeoutMember(member, count);}
            }
        }
        else {
            await UserReputation.modifyReputation(member, 0.035);
        }
    }
}
