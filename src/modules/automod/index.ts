import { PrismaClient } from '@prisma/client';
import { Guild, Snowflake } from 'discord.js';
import ExpiryMap from 'expiry-map';
import Duration from '../../util/duration';

/**
 * Represents a guild configuration.
 */
export type Config = {
    guildId: Snowflake
}

/**
 * Represents a guild configuration with an 'enabled' attribute.
 */
export type ToggleableConfig = Config & {
    enabled: boolean
}

/**
 * Abstraction for entities that hold persistent guild configurations backed by an expiry cache.
 *
 * Cache implementation is abstracted away, so inherited classes need only implement the
 * database logic.
 */
export abstract class ConfigHolder<ConfigType extends Config> {
    protected readonly prisma = new PrismaClient();
    private readonly configCache: ExpiryMap<string, ConfigType>;

    constructor(ttl: Duration) {
        this.configCache = new ExpiryMap(ttl.toMilliseconds());
    }

    private async fetchConfig(guild: Guild) {
        const config = await this.upsertConfig(guild, this.getDefaultConfig(guild), true);
        this.configCache.set(guild.id, config);
        return config;
    }

    // TODO: This might need a different class type parameter in the future in order to allow for the usage of db default values
    /**
     * Returns the default configuration to use for the given guild.
     * @param guild The guild to get the default config of.
     * @returns The configuration to use for the guild.
     */
    protected abstract getDefaultConfig(guild: Guild): ConfigType;

    /**
     * Upserts the provided configuration for the given guild to the database.
     *
     * If `fetch` is set to true, designates a fetch operation. Fetch operations only update the database
     * to insert a new configuration (one that doesn't already exist).
     * @param guild The guild to upsert the config of.
     * @param config The configuration to upsert.
     * @param fetch Whether this upsert operation is a fetch or not.
     */
    protected abstract upsertConfig(guild: Guild, config: ConfigType, fetch: boolean): Promise<ConfigType>;

    /**
     * Retrieves the configuration for this holder.
     *
     * This will first attempt to get the configuration from the cache, and query the database
     * if the configuration is not found.
     * @param guild The guild of which to retrieve the configuration from.
     * @returns The config.
     */
    public async retrieveConfig(guild: Guild): Promise<ConfigType> {
        return this.configCache.get(guild.id) ?? await this.fetchConfig(guild);
    }

    /**
     * Updates the configuration for a given guild. This will replace/set the guild's configuration to whatever is provided.
     *
     * This automatically adds the provided config to the cache first, before updating the database.
     * @param guild The guild to update the configuration of.
     * @param config The config to set to.
     */
    public async setConfig(guild: Guild, config: ConfigType) {
        this.configCache.set(guild.id, config);
        await this.upsertConfig(guild, config, false);
    }
}

/**
 * Abstraction for entities that hold guild configurations that are toggleable at the guild level.
 */
export abstract class ToggleableConfigHolder<ConfigType extends ToggleableConfig> extends ConfigHolder<ConfigType> {
    /**
     * Enables or disables the configuration for the given guild.
     * @param guild The guild to enable/disable the config of.
     * @param enabled `true` if enabled, `false` otherwise.
     */
    public async setEnabled(guild: Guild, enabled: boolean) {
        const config = await this.retrieveConfig(guild);
        config.enabled = enabled;
        await this.setConfig(guild, config);
    }
}
