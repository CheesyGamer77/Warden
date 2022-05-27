import { GuildMember, Message, Permissions } from 'discord.js';
import { createHash } from 'crypto';
import { canDelete } from '../../util/checks';
import LoggingModule from '../logging/LoggingModule';
import ExpiryMap from 'expiry-map';
import UserReputation from './UserReputation';

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

export default class AntiSpamModule {
    private static cache: ExpiryMap<string, AntiSpamEntry> = new ExpiryMap(5 * 1000 * 60);

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

    private static setAndGet(message: Message): AntiSpamEntry {
        const key = this.getSpamKey(message);
        let entry = this.cache.get(key) ?? {
            count: 0,
            hash: this.getContentHash(message),
            references: [ this.getMessageReference(message) ]
        };

        entry.count += 1;
        this.cache.set(key, entry);

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
        if(message.guild == null || message.author.bot || message.channel.type == 'DM') return true;

        return message.member?.permissionsIn(message.channel).has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
    }

    static async process(message: Message) {
        if(this.shouldIgnore(message) || message.member == null) return;

        const entry = this.setAndGet(message);
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
