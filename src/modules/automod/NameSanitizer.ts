import { Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import replacements from '../../../data/fancy_replacements.json';
import { canModerate } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import LoggingModule from '../logging/LoggingModule';
import i18next from 'i18next';
import AutoMod from '.';
import ExpiryMap from 'expiry-map';
import { NameSanitizerConfig, PrismaClient } from '@prisma/client';
import Duration from '../../util/duration';

const fancy_replacements = new Map<string, string>();
for (const pair of Object.entries(replacements)) {
    fancy_replacements.set(pair[0], pair[1]);
}

const prisma = new PrismaClient();

export default class NameSanitizerModule extends null {
    private static readonly configCache: ExpiryMap<string, NameSanitizerConfig> = new ExpiryMap(Duration.ofMinutes(30).toMilliseconds());

    private static cleanFancyText(content: string) {
        let sanitized = '';

        for (const char of content) {
            sanitized = sanitized.concat(fancy_replacements.get(char) ?? char);
        }

        return sanitized;
    }

    private static canOverwriteName(member: GuildMember): boolean {
        return member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames) ?? false;
    }

    public static async setEnabled(guild: Guild, enabled: boolean) {
        const cache = await AutoMod.retrieveConfig(guild);
        cache.antiSpamEnabled = enabled;
        await AutoMod.setConfig(guild, cache);
    }

    public static async retrieveConfig(guild: Guild) {
        const guildId = guild.id;

        return this.configCache.get(guild.id) ?? await prisma.nameSanitizerConfig.upsert({
            where: {
                guildId: guildId
            },
            create: {
                guildId: guildId
            },
            update: {}
        });
    }

    /**
     * Sanitizes a member's display name according to a particular guild's configuration
     * @param member The member who's name should be sanitized
     */
    public static async sanitize(member: GuildMember) {
        const channel = await LoggingModule.retrieveLogChannel('userFilter', member.guild);
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
}
