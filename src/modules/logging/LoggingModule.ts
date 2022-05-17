import { PrismaClient, LogConfig } from "@prisma/client";
import { Guild, TextChannel } from "discord.js";

const prisma = new PrismaClient();

export enum LogEventType {
    JOINS,
    LEAVES
}

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

        // set appropriate channel id
        let channelId: string | null;
        switch(event) {
            case LogEventType.JOINS:
                channelId = config.joinsChannelId;
                break;
            case LogEventType.LEAVES:
                channelId = config.leavesChannelId;
                break;
            default:
                channelId = null;
                break;
        }

        // resolve the said log channel
        if(channelId != null) {
            const channel = guild.channels.cache.get(channelId);
            return channel?.type == 'GUILD_TEXT' ? channel : null
        }

        return null;
    }
}