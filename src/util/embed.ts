import { MessageEmbed, User } from 'discord.js';
import i18next from 'i18next';

/**
 * Returns an embed with a particular user as the embed author. This is primarily used in the Logging module.
 * This will set the embed as follows:
 * - The author name will be the user's full Discord tag
 * - The author picture will be the user's avatar
 * - The footer will be "User ID: " plus the user's Discord ID
 * - The timestamp will be the current timestamp
 * @param user The user to use as the embed target
 * @param lng The locale to use for the footer translation
 * @returns A MessageEmbed with the above properties
 */
export function getEmbedWithTarget(user: User, lng: string): MessageEmbed {
    return new MessageEmbed()
        .setAuthor({ name: user.tag, iconURL: user.avatarURL() ?? user.defaultAvatarURL })
        .setFooter({ text: i18next.t('logging.common.footer', { lng: lng, userId: user.id }) })
        .setTimestamp();
}
