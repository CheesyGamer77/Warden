import { PrismaClient, LogConfig } from '@prisma/client';
import { Guild, TextChannel, Formatters, GuildMember, PartialGuildMember, Message } from 'discord.js';
import { canMessage } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import ExpiryMap from 'expiry-map';

const prisma = new PrismaClient();

export type LogEventType = 'joins' | 'leaves' | 'userFilter' | 'userChanges' | 'textFilter' | 'escalations';

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

        const user = member.user;

        const embed = getEmbedWithTarget(user)
            .setTitle('Member Joined')
            .setDescription(user.toString() + ' joined the server')
            .setColor('GREEN')
            .addField('Account Created', Formatters.time(user.createdAt, 'R'));

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberLeft(member: GuildMember | PartialGuildMember) {
        const channel = await this.fetchLogChannel('leaves', member.guild);

        const user = member.user;

        const embed = getEmbedWithTarget(user)
            .setTitle('Member Left')
            .setDescription(user.toString() + ' left the server')
            .setColor('RED');

        // a removed member's joined at timestamp has the potential to be null
        let memberSince: string;
        if (member.joinedAt != null) {memberSince = Formatters.time(member.joinedAt, 'R');}
        else {memberSince = 'Unknown';}

        embed.addField('Member Since', memberSince);

        await channel?.send({
            content: user.id,
            embeds: [ embed ],
        });
    }

    static async logMemberSpamming(message: Message) {
        if (message.guild == null) return;

        const channel = await this.fetchLogChannel('textFilter', message.guild);

        const embed = getEmbedWithTarget(message.author)
            .setTitle('Message Filtered')
            .setDescription(`${message.author.toString()} was filtered for sending too many duplicate messages in ${message.channel.toString()}`)
            .setColor('BLUE');

        // splitting code below taken from https://stackoverflow.com/a/58204391
        const parts = message.content.match(/\b[\w\s]{2000,}?(?=\s)|.+$/g) ?? [ message.content ];
        for (const part of parts) {
            embed.addField('Message', part.trim());
        }

        await channel?.send({
            content: message.author.id,
            embeds: [ embed ],
        });
    }

    static async logMemberTimeout(opts: LogMemberTimeoutOptions) {
        const target = opts.target;
        const until = new Date(opts.until);

        const channel = await this.fetchLogChannel(opts.channelType, target.guild);

        const embed = getEmbedWithTarget(target.user)
            .setTitle('User in Timeout')
            .setDescription(`${target.toString()} was put in timeout for ${Formatters.time(until, 'R')} (until ${Formatters.time(until, 'F')})`)
            .setColor('ORANGE');

        const mod = opts.moderator;
        if (mod != undefined) {embed.addField('Moderator', `${mod.toString()} \`(${mod.id})\``);}

        embed.addField('Reason', opts.reason ?? 'No Reason Given');

        await channel?.send({
            content: target.id,
            embeds: [ embed ],
        });
    }
}
