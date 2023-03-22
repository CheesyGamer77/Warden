import { Guild, GuildMember } from 'discord.js';
import { NameSanitizerConfig, Prisma, PrismaClient } from '@prisma/client';
import Duration from '../../../util/duration';
import { ToggleableConfigHolder } from '../../../util/config';
import { NameSanitizerWorker } from './worker';

const prisma = new PrismaClient();

/**
 * Module for automatically removing fancy text characters from nicknames.
 */
export default class NameSanitizerModule extends ToggleableConfigHolder<NameSanitizerConfig, Prisma.NameSanitizerConfigCreateInput> {
    private static _instance: NameSanitizerModule | undefined = undefined;

    public static get instance() {
        if (!this._instance) {
            this._instance = new NameSanitizerModule(Duration.ofMinutes(30));
        }

        return this._instance;
    }

    protected override getDefaultConfig(guild: Guild): NameSanitizerConfig {
        return {
            guildId: guild.id,
            enabled: false,
            blankFallbackName: 'nickname',
            cleanFancyCharacters: false
        };
    }

    protected override async upsertConfig(guild: Guild, config: NameSanitizerConfig | Prisma.NameSanitizerConfigCreateInput, fetch: boolean): Promise<NameSanitizerConfig> {
        const update = !fetch ? config : {};

        return await prisma.nameSanitizerConfig.upsert({
            where: {
                guildId: guild.id
            },
            create: config,
            update: update
        });
    }

    /**
     * Sanitizes a member's display name according to a particular guild's configuration.
     *
     * ## Pre-Checks
     * This method immediately returns if:
     * - The guild does not have a user filter log channel configured.
     * - The target member is not able to be moderated on.
     *
     * ## Caching
     * This method may retrieve and cache any previously non-cached automod and logging configurations for the guild of which
     * the member originates from.
     *
     * ## After Execution
     *
     * The member's nickname will be modified if the sanitized nickname does not match their original nickname.
     *
     * @param member The member who's name should be sanitized
     */
    public async sanitize(member: GuildMember) {
        const config = await this.retrieveConfig(member.guild);

        const content = member.nickname;
        if (!content) return;

        new NameSanitizerWorker().process({
            guild: member.guild,
            member,
            content,
            config
        });
    }
}
