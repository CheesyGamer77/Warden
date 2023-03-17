import { Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import replacements from '../../../../data/fancy_replacements.json';
import { canModerate } from '../../../util/checks';
import { getEmbedWithTarget } from '../../../util/embed';
import LoggingModule from '../../logging/LoggingModule';
import i18next from 'i18next';
import { NameSanitizerConfig, Prisma, PrismaClient } from '@prisma/client';
import Duration from '../../../util/duration';
import { ToggleableConfigHolder } from '../../../util/config';

const fancy_replacements = new Map<string, string>();
for (const pair of Object.entries(replacements)) {
    fancy_replacements.set(pair[0], pair[1]);
}

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

    private cleanFancyText(content: string) {
        let sanitized = '';

        for (const char of content) {
            sanitized = sanitized.concat(fancy_replacements.get(char) ?? char);
        }

        return sanitized;
    }

    private canOverwriteName(member: GuildMember): boolean {
        return member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames) ?? false;
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
        const channel = await LoggingModule.instance.retrieveLogChannel('userFilter', member.guild);
        if (channel == null || !canModerate(member.guild.members.me, member)) return;

        const config = await this.retrieveConfig(member.guild);

        const name = member.displayName;
        const lng = member.guild.preferredLocale;
        let sanitized: string = name;

        if (config.cleanFancyCharacters) sanitized = this.cleanFancyText(name);

        if (name != sanitized && this.canOverwriteName(member)) {
            // If the sanitized name ends up being empty, resort to the guild's fallback blank nickname
            if (sanitized.trim() === '') sanitized = config.blankFallbackName;

            const reason = i18next.t('logging.automod.nameSanitizer.filtered.reason', { lng: lng });
            await member.edit({
                nick: sanitized,
                reason: reason
            });

            await channel.send({
                content: member.id,
                embeds: [
                    getEmbedWithTarget(member.user, lng)
                        .setTitle(i18next.t('logging.automod.nameSanitizer.filtered.title', { lng: lng }))
                        .setDescription(
                            i18next.t('logging.automod.nameSanitizer.filtered.description', {
                                lng: lng,
                                userMention: member.toString()
                            }))
                        .setColor(0xfee75c)
                        .addFields(
                            {
                                'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.before.name', { lng: lng }),
                                'value': name,
                            },
                            {
                                'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.after.name', { lng: lng }),
                                'value': sanitized
                            },
                            {
                                'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.reason.name', { lng: lng }),
                                'value': reason
                            }
                        )
                ],
            });
        }
    }

    /**
     * Handles an incoming name change
     * @param member The member who's name was changed
     */
    public async handleNameChange(member: GuildMember) {
        const config = await this.retrieveConfig(member.guild);
        if (config.enabled) await this.sanitize(member);
    }
}
