import { AutoModConfig, PrismaClient } from '@prisma/client';
import { Guild, GuildMember } from 'discord.js';
import ExpiryMap from 'expiry-map';
import Duration from '../../util/duration';
import NameSanitizerModule from './NameSanitizer';

const prisma = new PrismaClient();

export default class AutoMod {
    private configCache: ExpiryMap<string, AutoModConfig> = new ExpiryMap(Duration.ofMinutes(30).toMilliseconds());
    private static _instance: AutoMod | undefined = undefined;

    /**
     * Returns the current instance of AutoMod
     */
    public static get instance() {
        if (!this._instance) {
            this._instance = new AutoMod();
        }

        return this._instance;
    }

    /**
     * Retrieves the automod configuration for a particular guild.
     * This will retrieve the cached entry first, followed by upserting a new default configuration.
     * @param guild The guild to retrieve the automod configuration of
     * @returns The configuration
     */
    public async retrieveConfig(guild: Guild) {
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

    public async setConfig(guild: Guild, newConfig: AutoModConfig) {
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

    public async handleNameChange(member: GuildMember) {
        const config = await this.retrieveConfig(member.guild);
        if (config.nameSanitizerEnabled) await NameSanitizerModule.sanitize(member);
    }
}
