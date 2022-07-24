import { Guild } from 'discord.js';
import ExpiryMap from 'expiry-map';
import Duration from '../../../util/duration';

/**
 * Represents an entity used to moderate specific types of content.
 * Auto mod runners are the backbone of the auto moderation system. They process and respond
 * to a particular input context depending on the guild's configuration of said runner.
 */
export default abstract class AutoModRunner<Config, Context extends AutoModContext<Config>, Results extends AutoModRunnerResults> extends null {
    /**
     * Main entrypoint for the automod runner. Given the context, this determines whether
     * the runner should continue to process and handle the context or not.
     * @param ctx The input context containing parameters for the runner.
     * @returns A promise containing the runner's results if the runner is processed, null otherwise.
     */
    public abstract process(ctx: Context): Promise<Results | null>

    /**
     * Executes this runner on a given input.
     * @param ctx The input context containing parameters for the runner.
     * @returns The runner's results.
     */
    protected abstract getResults(ctx: Context): Promise<Results>;
}

/**
 * Represents a particular set of results returned by an auto mod runner.
 */
export abstract class AutoModRunnerResults {
    public readonly isFiltered: boolean;
    public readonly isTest: boolean;

    constructor(isFiltered: boolean, isTest: boolean) {
        this.isFiltered = isFiltered;
        this.isTest = isTest;
    }
}

/**
 * Represents a set of input parameters given to an auto mod runner.
 * Different runners may desire different kinds of parameters, though they all share both a
 * non-null guild and a means of retrieving the runner's configuration.
 */
export abstract class AutoModContext<Config> {
    protected guild: Guild;
    protected configCache: ExpiryMap<string, Config> = new ExpiryMap(Duration.ofMinutes(30).toMilliseconds());

    constructor(guild: Guild) {
        this.guild = guild;
    }

    /**
     * Makes an external query (typically a databse) to fetch this runner's configuration.
     * This acts as a fallback in case there is no cached configuration entry.
     * This should not be directly called by child classes, only overriden.
     */
    protected abstract fetchConfiguration(): Promise<Config>

    /**
     * Retrieves the runner's configuration for the given guild.
     * This should not be overriden by child classes.
     * @returns The runner's configuration.
     */
    protected async retrieveConfiguration() {
        return this.configCache.get(this.guild.id) ?? await this.fetchAndCacheConfiguration();
    }

    /**
     * Fetches the runner's configuration and caches it.
     * @returns The runner's configuration.
     */
    private async fetchAndCacheConfiguration() {
        const config = await this.fetchConfiguration();

        this.configCache.set(this.guild.id, config);

        return config;
    }
}
