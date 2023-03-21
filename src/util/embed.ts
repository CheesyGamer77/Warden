import { EmbedBuilder, GuildMember, User } from 'discord.js';
import i18next from 'i18next';

function isMember(union: User | GuildMember): union is GuildMember {
    return Object.prototype.hasOwnProperty.call(union, 'guild');
}

/**
 * Returns an embed with a particular user/member as the embed author.
 * This will set the embed as follows:
 * - The author name will be the target's full Discord tag
 * - The author picture will be the target's guild avatar if configured, else their user avatar
 * - The footer will be "User ID: " plus the user's Discord ID
 * - The timestamp will be the current timestamp
 * @param target The member/user to use as the embed target
 * @param lng The locale to use for the footer translation
 * @returns A EmbedBuilder with the above properties
 */
export function getEmbedWithTarget(target: User | GuildMember, lng: string): EmbedBuilder {
    const iconURL = target.displayAvatarURL();
    const name = isMember(target) ? target.user.tag : target.tag;

    return new EmbedBuilder()
        .setAuthor({ name, iconURL })
        .setFooter({ text: i18next.t('logging.common.footer', { lng: lng, userId: target.id }) })
        .setTimestamp();
}
