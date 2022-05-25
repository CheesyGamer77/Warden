import { PrismaClient, LogConfig } from "@prisma/client";
import { Guild, Permissions, TextChannel } from "discord.js";
import { canMessage } from "../../util/checks";

const prisma = new PrismaClient();

export type LogEventType = 'joins' | 'leaves' | 'userFilter' | 'userChanges';

export default class LoggingModule {
    /**
     * Creates a blank logging configuration
     * @param guild The guild to create the blank log configuration of
     */
    static async createBlankLogConfiguration(guild: Guild): Promise<LogConfig> {
        // TODO: Implement caching
        return await prisma.logConfig.create({
            data: {
                guildId: guild.id
            }
        })
    }

    /**
     * Fetches a guild's logging configuration.
     *
     * This will create a new blank configuration in the event that the config is not found.
     * @param guild The guild to fetch the config of
     * @returns The configuration
     */
    static async fetchLogConfiguration(guild: Guild): Promise<LogConfig> {
        // TODO: Implement caching
        const data = await prisma.logConfig.findUnique({
            where: {
                guildId: guild.id
            }
        })

        return data != null ? data : await this.createBlankLogConfiguration(guild);
    }

    /**
     * Fetches a guild's log TextChannel of a given event type
     * @param event The type of log event to fetch the log channel of
     * @param guild The guild to fetch the log channel from
     * @returns The TextChannel if it exists, else null
     */
    static async fetchLogChannel(event: LogEventType, guild: Guild): Promise<TextChannel | null> {
        // fetch the guild's configuration
        const config = await this.fetchLogConfiguration(guild);

        const channelId = config[event + 'ChannelId' as keyof LogConfig];

        // resolve the said log text channel
        if(channelId != null) {
            const channel = guild.channels.cache.get(channelId) ?? null;

           return canMessage(channel) && channel?.type == 'GUILD_TEXT' ? channel : null;
        }

        return null;
    }
}
