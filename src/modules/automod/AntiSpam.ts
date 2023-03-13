import { ChannelType, Formatters, Guild, GuildMember, GuildTextBasedChannel, Message, PermissionFlagsBits } from 'discord.js';
import { createHash } from 'crypto';
import { canDelete } from '../../util/checks';
import LoggingModule from '../logging/LoggingModule';
import ExpiryMap from 'expiry-map';
import UserReputation from './UserReputation';
import { AntispamConfig, AntiSpamIgnoredChannels, PrismaClient } from '@prisma/client';
import Duration from '../../util/duration';
import { getEmbedWithTarget } from '../../util/embed';
import i18next from 'i18next';
import { ToggleableConfigHolder } from '.';

type AntiSpamEntry = {
    count: number;
    hash: string;
}

type AntiSpamConfigWithChannels = AntispamConfig & {
    ignoredChannels: AntiSpamIgnoredChannels[]
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
export default class AntiSpamModule extends ToggleableConfigHolder<AntiSpamConfigWithChannels> {
    private entryCache: ExpiryMap<string, AntiSpamEntry> = new ExpiryMap(Duration.ofMinutes(1).toMilliseconds());
    private static _instance: AntiSpamModule | undefined = undefined;

    private constructor() {
        super(Duration.ofMinutes(30));
    }

    /**
     * Returns the current instance of AntiSpamModule.
     */
    public static get instance() {
        if (!this._instance) {
            this._instance = new AntiSpamModule();
        }

        return this._instance;
    }

    private getContentHash(message: Message) {
        return createHash('md5').update(message.content.toLowerCase()).digest('hex');
    }

    private getSpamKey(message: Message) {
        return `${message.guildId}:${message.author.id}:${this.getContentHash(message)}`;
    }

    private setAndGetEntry(message: Message): AntiSpamEntry {
        const key = this.getSpamKey(message);

        const entry = this.entryCache.get(key) ?? {
            count: 0,
            hash: this.getContentHash(message),
        };

        entry.count += 1;
        this.entryCache.set(key, entry);

        return entry;
    }

    private async deleteSpamMessage(message: Message) {
        if (message.guild == null || message.member == null) return;

        const channel = await LoggingModule.instance.retrieveLogChannel('textFilter', message.guild);
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

        await UserReputation.instance.modifyReputation(message.member, -0.2);
    }

    private async timeoutMember(member: GuildMember, instances: number) {
        const me = member.guild.members.me;
        if (me == null) return;

        const reason = `Spamming (${instances} instances)`;
        const until = Date.now() + Duration.ofMinutes(1).toMilliseconds();

        await member.disableCommunicationUntil(until, reason);

        const channel = await LoggingModule.instance.retrieveLogChannel('escalations', member.guild);
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
        // This should also be customizable
        await LoggingModule.instance.createActionLog({
            actionType: 'MUTE',
            guild: member.guild,
            target: member.user,
            moderator: me,
            minutes: 1,
            reason: reason
        });

        await UserReputation.instance.modifyReputation(member, -0.3);
    }

    // TODO: This is redundant
    private async channelIsIgnored(channel: GuildTextBasedChannel) {
        // This does not require a cache check since we already keep the ignored channels with the cached config
        const config = await this.retrieveConfig(channel.guild);
        const entry = config.ignoredChannels.find(c => c.channelId === channel.id);

        return entry !== undefined;
    }

    private getUpsertTransforms(config: AntiSpamConfigWithChannels) {
        const base = [...config.ignoredChannels.map(c => {
            return {
                where: {
                    guildId_channelId: {
                        guildId: c.guildId,
                        channelId: c.channelId
                    }
                },
                create: {
                    channelId: c.channelId
                }
            };
        })];

        return {
            create: {
                ...base
            },
            update: {
                upsert: [...base.map(t => {
                    return {
                        ...t,
                        update: t.create
                    };
                })]
            }
        };
    }

    protected override getDefaultConfig(guild: Guild): AntiSpamConfigWithChannels {
        return {
            guildId: guild.id,
            enabled: false,
            ignoredChannels: []
        };
    }

    protected override async upsertConfig(guild: Guild, config: AntiSpamConfigWithChannels, fetch: boolean): Promise<AntiSpamConfigWithChannels> {
        const transforms = this.getUpsertTransforms(config);

        const update = !fetch ? { ...config, ignoredChannels: { ...transforms.update } } : {};

        return await prisma.antispamConfig.upsert({
            where: {
                guildId: guild.id
            },
            create: {
                ...config,
                ignoredChannels: {
                    connectOrCreate: {
                        ...transforms.create
                    }
                }
            },
            update: update,
            include: {
                ignoredChannels: true
            }
        });
    }

    /**
     * Sets a text channel to be ignored by the anti-spam.
     * This automatically adds the entry to the anti-spam's ignored channels cache.
     * If the text channel is already ignored, the operation is cancelled.
     * @param channel The channel to ignore
     */
    async ignoreChannel(channel: GuildTextBasedChannel) {
        const data = { guildId: channel.guildId, channelId: channel.id };
        const { channelId } = data;

        const config = await this.retrieveConfig(channel.guild);
        if ((await this.channelIsIgnored(channel))) return;

        config.ignoredChannels.push({ guildId: data.guildId, channelId });

        await this.setConfig(channel.guild, config);
    }

    /**
     * Sets a text channel to be moderated by the anti-spam again (assuming it's enabled for the guild).
     * This automatically modifies the anti-spam's ignored channels cache appropriately.
     * If the text channel is already unignored, the operation is cancelled.
     * @param channel The channel to no longer ignore
     */
    async unIgnoreChannel(channel: GuildTextBasedChannel) {
        const config = await this.retrieveConfig(channel.guild);
        config.ignoredChannels = config.ignoredChannels.filter(c => c.channelId !== channel.id);

        await this.setConfig(channel.guild, config);
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
    async process(message: Message) {
        const channel = message.channel;
        const member = message.member;

        // ignore if the antispam is disabled for the guild
        const guild = message.guild;
        if (guild != null && !(await this.retrieveConfig(guild)).enabled) return;

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
            await UserReputation.instance.modifyReputation(member, 0.035);
        }
    }
}
