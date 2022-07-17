import { AutoModConfig, PrismaClient } from '@prisma/client';
import { Guild, GuildMember } from 'discord.js';
import ExpiryMap from 'expiry-map';
import Duration from '../../util/duration';
import NameSanitizerModule from './NameSanitizer';

const prisma = new PrismaClient();

export default class AutoMod extends null {
    private static configCache: ExpiryMap<string, AutoModConfig> = new ExpiryMap(Duration.ofMinutes(30).toMilliseconds());

    /**
     * Retrieves the automod configuration for a particular guild.
     * This will retrieve the cached entry first, followed by upserting a new default configuration.
     * @param guild The guild to retrieve the automod configuration of
     * @returns The configuration
     */
    public static async retrieveConfig(guild: Guild) {
        const guildId = guild.id;

        return this.configCache.get(guildId) ?? await prisma.autoModConfig.upsert({
            where: {
                guildId: guildId
            },
            update: {},
            create: {
                guildId: guildId
            }
        });
    }

    public static async setConfig(guild: Guild, newConfig: AutoModConfig) {
        const guildId = guild.id;

        await prisma.autoModConfig.upsert({
            where: {
                guildId: guildId
            },
            update: newConfig,
            create: newConfig
        });

        this.configCache.set(guild.id, newConfig);
    }

    public static async handleNameChange(member: GuildMember) {
        const config = await this.retrieveConfig(member.guild);
        if (config.nameSanitizerEnabled) await NameSanitizerModule.sanitize(member);
    }
}
