import { Colors, Guild, GuildMember, GuildTextBasedChannel, Message } from 'discord.js';
import { ToggleableConfig as GuildConfig } from '../../util/config';
import LoggingModule, { LogEventType } from '../logging/LoggingModule';

export enum ContentSeverity {
    SAFE,
    GREY_ZONE,
    QUESTIONABLE,
    MODERATE,
    DANGEROUS,
    EXTREME
}
export type ContentSeverityResolvable = keyof typeof ContentSeverity;

export type AutoModContext<Content, Config extends Readonly<GuildConfig>> = {
    content: Content
    guild: Guild
    member: GuildMember
    config: Config
    isTest: boolean
}

export type AutoModMessageContext<Content, Config extends Readonly<GuildConfig>> = Omit<AutoModContext<Content, Config>, 'content'> & {
    content: Message<true>
}

type WorkerProcessInput<Content, Config extends Readonly<GuildConfig>> = Omit<AutoModContext<Content, Config>, 'isTest'> & {
    isTest?: boolean,
    logChannelOverride?: GuildTextBasedChannel
}
type WorkerRunInput<Content, Config extends Readonly<GuildConfig>> = Omit<WorkerProcessInput<Content, Config>, 'isTest' | 'logChannelOverride'>;

type WorkerResults<Content, Config extends Readonly<GuildConfig>, Context extends Readonly<AutoModContext<Content, Config>>> = {
    ctx: Context
    moderated: boolean
    severity: ContentSeverity
}

type WorkerSendResultsOpts<Content, Config extends Readonly<GuildConfig>, Context extends Readonly<AutoModContext<Content, Config>>> = {
    results: WorkerResults<Content, Config, Context>
    channel: GuildTextBasedChannel
}

/**
 * Represents an automoderation module worker.
 *
 * Workers serve as the main entrypoint when content is to be processed by Warden's automod.
 *
 * Worker are responsible for determining how the content is to be processed given a number of parameters
 * wrapped in what's called its `context`.
 */
export abstract class AutoModWorker<Content, Config extends Readonly<GuildConfig>, Context extends AutoModContext<Content, Config>> {
    /**
     * Returns the name of the worker.
     */
    protected abstract getName(): string

    /**
     * Sends the provided worker results into the appropriate channel.
     */
    protected abstract sendResults(opts: WorkerSendResultsOpts<Content, Config, Context>): Promise<void>

    /**
     * Gets the color that corresponds to a given severety level.
     * @param severity The severety level.
     * @returns The corresponding color.
     */
    protected getSeverityColor(severity: ContentSeverity) {
        switch (severity) {
            case ContentSeverity.SAFE: {
                return Colors.Green;
            }
            case ContentSeverity.GREY_ZONE: {
                return Colors.Grey;
            }
            case ContentSeverity.QUESTIONABLE: {
                return Colors.Yellow;
            }
            case ContentSeverity.MODERATE: {
                return Colors.Orange;
            }
            case ContentSeverity.DANGEROUS: {
                return Colors.Red;
            }
            case ContentSeverity.EXTREME: {
                return Colors.DarkRed;
            }
            default: {
                return Colors.Default;
            }
        }
    }

    /**
     * Returns the key of the log channel to use to send worker results to.
     */
    protected abstract getLogChannelKey(): LogEventType;

    /**
     * Retrieves the log channel for this worker.
     * @param ctx The input context.
     * @returns The channel to log worker results to.
     */
    protected async retrieveLogChannel(ctx: Context) {
        return await LoggingModule.instance.retrieveLogChannel(this.getLogChannelKey(), ctx.guild);
    }

    /**
     * Runs the worker on the given context and returns the results.
     * @param ctx The input context.
     */
    protected abstract run(ctx: WorkerRunInput<Content, Config>): Promise<WorkerResults<Content, Config, Context>>;

    private async _process(opts: WorkerProcessInput<Content, Config>) {
        const ctx = { ...opts, isTest: opts.isTest ?? false } as Context;
        const { logChannelOverride } = opts;

        // always ensure that we at least have a channel to log results to
        const logChannel = logChannelOverride ?? await this.retrieveLogChannel(ctx);
        if (!logChannel || (!ctx.config.enabled && !ctx.isTest)) return;

        const results = await this.run(ctx);

        if (results.moderated || ctx.isTest) {
            await this.sendResults({ results, channel: logChannel });
        }
    }

    /**
     * Main entrypoint for the automod worker.
     *
     * **Child classes should not override this method.**
     * @param opts The input options.
     */
    public async process(opts: WorkerProcessInput<Content, Config>) {
        await this._process(opts);
    }
}

/**
 * Represents an automod worker that handles content based in Discord messages.
 */
export abstract class AutoModMessageBasedWorker<Config extends Readonly<GuildConfig>, Context extends AutoModMessageContext<Message<true>, Config>> extends AutoModWorker<Message<true>, Config, Context> {
    protected override getLogChannelKey(): LogEventType {
        return 'textFilter';
    }
}
