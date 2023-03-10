import { ChannelType, Formatters, Guild, GuildMember, GuildTextBasedChannel, Message, PermissionFlagsBits } from 'discord.js';
import { createHash } from 'crypto';
import { canDelete } from '../../util/checks';
import LoggingModule from '../logging/LoggingModule';
import ExpiryMap from 'expiry-map';
import UserReputation from './UserReputation';
import { PrismaClient } from '@prisma/client';
import AutoMod from '.';
import Duration from '../../util/duration';
import { getEmbedWithTarget } from '../../util/embed';
import i18next from 'i18next';
import ExpirySet from 'expiry-set';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

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

const prisma = new PrismaClient();

/**
 * Module for preventing spam in the form of excessive, repeated messages.
 *
 * Each message sent has its content hashed and added to an expiry cache. Content hashes that occur a certain ammount
 * will result in the incoming message marked as spam. Message authors may be automatically timed out as a result of
 * frequently posting spam messages.
 *
 * This module utilizes message frequency, rather than the message's content, to identify spam messages. Messages with content
 * that is commonly associated with spam, such as newline spam, zero-width-space spam, copypastas, etc may not be marked
 * as spam until the message is repeated excessively.
 */
export default class AntiSpamModule extends null {
    private static entryCache: ExpiryMap<string, AntiSpamEntry> = new ExpiryMap(Duration.ofMinutes(1).toMilliseconds());
    private static ignoredEntitiesCache: ExpirySet<string> = new ExpirySet(Duration.ofMinutes(30).toMilliseconds());

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
        if (message.guild == null || message.member == null) return;

        const channel = await LoggingModule.retrieveLogChannel('textFilter', message.guild);
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

        await UserReputation.modifyReputation(message.member, -0.2);
    }

    private static async timeoutMember(member: GuildMember, instances: number) {
        const me = member.guild.members.me;
        if (me == null) return;

        const reason = `Spamming (${instances} instances)`;
        const until = Date.now() + Duration.ofMinutes(1).toMilliseconds();

        await member.disableCommunicationUntil(until, reason);

        const channel = await LoggingModule.retrieveLogChannel('escalations', member.guild);
        const lng = member.guild.preferredLocale;

        const embed = getEmbedWithTarget(member.user, lng)
            .setTitle(i18next.t('logging.automod.antispam.timeout.title', { lng: lng }))
            .setDescription(i18next.t('logging.automod.antispam.timeout.description', {
                lng: lng,
                userMention: member.toString(),
                untilTimeMentionLong: Formatters.time(until, 'F'),
                untilTimeMentionRelative: Formatters.time(until, 'R')
            }))
            .setColor('Orange');

        embed.addFields([{
            name: i18next.t('logging.automod.antispam.timeout.fields.moderator.name', { lng: lng }),
            value: `${me.toString()} \`(${me.id})\``
        }]);

        embed.addFields([{
            name: i18next.t('logging.automod.antispam.timeout.fields.reason.name', { lng: lng }),
            value: reason
        }]);

        await channel?.send({
            content: member.id,
            embeds: [ embed ],
        });

        // TODO: This just *happens* to always be one minute. Temp workaround till we refactor this whole thing
        await LoggingModule.createActionLog({
            actionType: 'MUTE',
            guild: member.guild,
            target: member.user,
            moderator: me,
            minutes: 1,
            reason: reason
        });

        await UserReputation.modifyReputation(member, -0.3);
    }

    private static async channelIsIgnored(channel: GuildTextBasedChannel) {
        const channelId = channel.id;

        const ignored = this.ignoredEntitiesCache.has(channelId);
        if (ignored !== undefined) return ignored;

        const data = await prisma.antiSpamIgnoredChannels.findUnique({
            where: {
                guildId_channelId: {
                    guildId: channel.guildId,
                    channelId: channelId
                }
            }
        });

        return data !== undefined;
    }

    private static async setEnabled(guild: Guild, enabled: boolean) {
        const config = await AutoMod.retrieveConfig(guild);
        config.antiSpamEnabled = enabled;
        await AutoMod.setConfig(guild, config);
    }

    /**
     * Disables the anti-spam for a particular guild.
     * This automatically updates the automod config cache respectively.
     * @param guild The guild to disable the anti-spam for
     */
    static async ignoreGuild(guild: Guild) {
        await this.setEnabled(guild, false);
    }

    /**
     * Enables the anti-spam for a particular guild.
     * This automatically updates the automod config cache respectively.
     * @param guild The guild to enable the anti-spam for
     */
    static async unignoreGuild(guild: Guild) {
        await this.setEnabled(guild, true);
    }

    /**
     * Sets a text channel to be ignored by the anti-spam.
     * This automatically adds the entry to the anti-spam's ignored channels cache.
     * If the text channel is already ignored, the operation is cancelled.
     * @param channel The channel to ignore
     */
    static async ignoreChannel(channel: GuildTextBasedChannel) {
        const data = { guildId: channel.guildId, channelId: channel.id };
        const { channelId } = data;

        if (this.ignoredEntitiesCache.has(channelId)) return;

        this.ignoredEntitiesCache.add(channelId);

        await prisma.antiSpamIgnoredChannels.upsert({
            create: data,
            update: {},
            where: {
                guildId_channelId: data
            }
        });
    }

    /**
     * Sets a text channel to be moderated by the anti-spam again (assuming it's enabled for the guild).
     * This automatically modifies the anti-spam's ignored channels cache appropriately.
     * If the text channel is already unignored, the operation is cancelled.
     * @param channel The channel to ignore
     */
    static async unIgnoreChannel(channel: GuildTextBasedChannel) {
        const data = { guildId: channel.guildId, channelId: channel.id };

        this.ignoredEntitiesCache.delete(data.channelId);

        try {
            await prisma.antiSpamIgnoredChannels.delete({
                where: {
                    guildId_channelId: data
                }
            });
        }
        catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                return;
            }
        }
    }

    /**
     * Processes a given message against the antispam.
     *
     * ## Pre-Checks
     * This method immediately returns if any of the following occur:
     * - The guild that is associated with the provided message has disabled the antispam.
     * - The message was posted in a DM Channel or News Channel.
     * - The message has no member associated with it.
     * - The message was written by a bot.
     * - The message author has `MANAGE_MESSAGES` permissions.
     * - The message was posted in a channel configured to be ignored by the antispam.
     *
     * ## Caching
     * This method may retrieve and cache any previously non-cached automod configurations for the guild of which
     * the message originates from.
     *
     * ## After Execution
     * The author of the provided message will receive a small user reputation increase if the message is not moderated.
     * The author will have their user reputation decreased if the message is moderated.
     *
     * The provided message will be deleted under the following conditions:
     * - The bot is able to delete the message.
     * - The user has posted three of the same exact messages within the past minute.
     *
     * The author of the provided message will be also timed out for 1 minute if the user has
     * posted five of the same exact messages within the past minute.
     *
     * @param message The message to further process
     */
    static async process(message: Message) {
        const channel = message.channel;
        const member = message.member;

        // ignore if the antispam is disabled for the guild
        const guild = message.guild;
        if (guild != null && !(await AutoMod.retrieveConfig(guild)).antiSpamEnabled) return;

        // ignore DM and news channels, non-guild messages, and messages with a null member author
        if (channel.type == ChannelType.DM || channel.type == ChannelType.GuildNews || member == null) return;

        // ignore bots and members with manage message perms
        if (member.user.bot || member.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) return;

        // ignore if the message is from an ignored channel
        if (await this.channelIsIgnored(channel)) return;

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
