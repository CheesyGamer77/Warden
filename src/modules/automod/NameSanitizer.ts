import { GuildMember, Permissions } from 'discord.js';
import replacements from '../../../data/fancy_replacements.json';
import { canModerate } from '../../util/checks';
import { getEmbedWithTarget } from '../../util/embed';
import LoggingModule from '../logging/LoggingModule';
import i18next from 'i18next';

const fancy_replacements = new Map<string, string>();
for (const pair of Object.entries(replacements)) {
    fancy_replacements.set(pair[0], pair[1]);
}

export default class NameSanitizerModule {
    private static cleanFancyText(content: string): string {
        let sanitized = '';

        for (const char of content) {
            sanitized = sanitized.concat(fancy_replacements.get(char) ?? char);
        }

        return sanitized;
    }

    private static canOverwriteName(member: GuildMember): boolean {
        return member.guild.me?.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES) ?? false;
    }

    /**
     * Sanitizes a member's display name to remove zalgo and "fancy text"
     * @param member The member who's name should be sanitized
     */
    static async sanitize(member: GuildMember) {
        const channel = await LoggingModule.fetchLogChannel('userFilter', member.guild);
        if (channel == null || !canModerate(member.guild.me, member)) return;

        const name = member.displayName;
        const lng = member.guild.preferredLocale;
        let sanitized = this.cleanFancyText(name);
        if (name != sanitized && this.canOverwriteName(member)) {

            // TODO: Default fallback nickname should be configurable per-guild
            // We won't localize this as a result
            if (sanitized.trim() === '') sanitized = 'Nickname';

            const reason = i18next.t('logging.automod.nameSanitizer.filtered.reason', { lng: lng });
            await member.edit({ nick: sanitized }, reason);

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
