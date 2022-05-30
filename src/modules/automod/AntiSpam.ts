import { Guild, GuildMember, Message, Permissions, TextChannel, ThreadChannel } from 'discord.js';
import { createHash } from 'crypto';
import { canDelete } from '../../util/checks';
import LoggingModule from '../logging/LoggingModule';
import ExpiryMap from 'expiry-map';
import UserReputation from './UserReputation';
import { PrismaClient } from '@prisma/client';

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
    private static entryCache: ExpiryMap<string, AntiSpamEntry> = new ExpiryMap(5 * 1000 * 60);
    private static ignoredChannelsCache: ExpiryMap<string, Set<string>> = new ExpiryMap(30 * 1000 * 60);

    private static getContentHash(message: Message) {
        return createHash('md5').update(message.content.toLowerCase()).digest('hex');
    }

    private static getSpamKey(message: Message) {
        return `${message.guildId}:${message.author.id}:${this.getContentHash(message)}`;
    }

    private static getMessageReference(message: Message): MessageReference {
        if(message.guildId == null) throw new Error('Message References must have a non-null guild id');

        return {
            guildId: message.guildId,
            channelId: message.channelId,
            id: message.id,
            createdAt: message.createdTimestamp
        }
    }

    private static setAndGetEntry(message: Message): AntiSpamEntry {
        const key = this.getSpamKey(message);
        let entry = this.entryCache.get(key) ?? {
            count: 0,
            hash: this.getContentHash(message),
            references: [ this.getMessageReference(message) ]
        };

        entry.count += 1;
        this.entryCache.set(key, entry);

        return entry;
    }

    private static async deleteSpamMessage(message: Message) {
        if(message.member == null) return;

        const deletedMessage = await message.delete();
        await LoggingModule.logMemberSpamming(deletedMessage);
        await UserReputation.modifyReputation(message.member, -0.2);
    }

    private static async timeoutMember(member: GuildMember | null, instances: number) {
        if(member == null || member.guild.me == null) return;

        const reason = `Spamming (${instances} instances)`;
        const until = Date.now() + (60 * 1000);

        await member.disableCommunicationUntil(until, reason);
        await LoggingModule.logMemberTimeout({
            target: member,
            moderator: member.guild.me,
            reason: reason,
            until: until,
            channelType: 'escalations'
        });
        await UserReputation.modifyReputation(member, -0.3);  // -0.5 total each time they're muted hereafter
    }

    private static shouldIgnore(message: Message): boolean {
        // TODO: Duplicate code (message channel type)
        if(message.guild == null || message.author.bot || message.channel.type == 'DM') return true;

        return message.member?.permissionsIn(message.channel).has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
    }

    private static getIgnoredChannelSet(guild: Guild): Set<string> {
        return this.ignoredChannelsCache.get(guild.id) ?? new Set();
    }

    private static async fetchIgnoredChannels(guild: Guild): Promise<Set<string>> {
        const guildId = guild.id;
        let set = this.ignoredChannelsCache.get(guildId);

        if(set === undefined) {
            set = new Set();

            const data = await prisma.antiSpamIgnoredChannels.findMany({
                where: {
                    guildId: guildId
                }
            })

            // TODO: Use async iteration?
            for(const pair of data) {
                set.add(pair.channelId);
            }
        }

        this.ignoredChannelsCache.set(guildId, set);

        return set;
    }

    private static async isIgnoredChannel(channel: IgnorableChannel) {
        return (await this.fetchIgnoredChannels(channel.guild)).has(channel.id);
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

        const set = this.getIgnoredChannelSet(channel.guild).add(channelId);
        this.ignoredChannelsCache.set(guildId, set);
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

        const set = this.getIgnoredChannelSet(channel.guild);
        set.delete(channelId);
        this.ignoredChannelsCache.set(guildId, set);
    }

    static async process(message: Message) {
        const channel = message.channel;

        // TODO: Really goofy guard clause
        if(channel.type == 'DM' || channel.type == 'GUILD_NEWS' || this.shouldIgnore(message) ||  message.member == null) return;

        if(await this.isIgnoredChannel(channel)) return;

        const entry = this.setAndGetEntry(message);
        const count = entry.count;

        if(count >= 3 && canDelete(message)) {
            await this.deleteSpamMessage(message)
            if(count >= 5) {
                if(message.member?.moderatable)
                    await this.timeoutMember(message.member, count);
            }
        }
        else {
            await UserReputation.modifyReputation(message.member, 0.035);
        }
    }
}
