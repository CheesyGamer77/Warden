import { PrismaClient, LogConfig } from '@prisma/client';
import { Guild, TextChannel, Formatters, GuildMember, PartialGuildMember } from 'discord.js';
import { canMessage } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import ExpiryMap from 'expiry-map';

const prisma = new PrismaClient();

export type LogEventType = 'joins' | 'leaves' | 'userFilter' | 'userChanges' | 'textFilter' | 'escalations';

export default class LoggingModule {
    private static configCache: ExpiryMap<string, LogConfig> = new ExpiryMap(15 * 1000 * 60);

    /**
     * Creates a blank logging configuration
     * @param guild The guild to create the blank log configuration of
     */
    static async createBlankLogConfiguration(guild: Guild): Promise<LogConfig> {
        const data = await prisma.logConfig.create({
            data: {
                guildId: guild.id
            }
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
        let data = this.configCache.get(guild.id) ?? await prisma.logConfig.findUnique({
            where: {
                guildId: guild.id
            }
        })

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
        if(channelId != null) {
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
            .addField('Account Created', Formatters.time(user.createdAt, 'R'))

        await channel?.send({
            content: user.id,
            embeds: [ embed ]
        });
    }

    static async logMemberLeft(member: GuildMember | PartialGuildMember) {
        const channel = await this.fetchLogChannel('leaves', member.guild);

        const user = member.user;

        const embed = getEmbedWithTarget(user)
            .setTitle('Member Left')
            .setDescription(user.toString() + ' left the server')
            .setColor('RED')

        // a removed member's joined at timestamp has the potential to be null
        let memberSince: string;
        if(member.joinedAt != null)
            memberSince = Formatters.time(member.joinedAt, 'R');
        else
            memberSince = 'Unknown';

        embed.addField('Member Since', memberSince);

        await channel?.send({
            content: user.id,
            embeds: [ embed ]
        });
    }
}
