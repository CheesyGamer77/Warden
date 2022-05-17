import { PrismaClient, LogConfig } from "@prisma/client";
import { Guild } from "discord.js";

const prisma = new PrismaClient();

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
}