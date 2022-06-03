import { MessageEmbed, User } from 'discord.js';
import i18next from 'i18next';

export function getEmbedWithTarget(user: User, lng: string): MessageEmbed {
    return new MessageEmbed()
        .setAuthor({ name: user.tag, iconURL: user.avatarURL() ?? user.defaultAvatarURL })
        .setFooter({ text: i18next.t('logging.common.footer', { lng: lng, userId: user.id }) })
        .setTimestamp();
}
