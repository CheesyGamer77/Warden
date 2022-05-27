import { MessageEmbed, User } from 'discord.js';

export function getEmbedWithTarget(user: User): MessageEmbed {
    return new MessageEmbed()
        .setAuthor({ name: user.tag, iconURL: user.avatarURL() ?? user.defaultAvatarURL })
        .setFooter({ text: 'User ID: ' + user.id })
        .setTimestamp();
}
