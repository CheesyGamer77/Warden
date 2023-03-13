import { Message, PartialMessage } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';
import { getEmbedWithTarget } from '../util/embed';

export default async function onMessageDelete(message: Message | PartialMessage) {
    if (message.partial) { return; }

    if (message.guild == null || message.content == '') { return; }

    const channel = await LoggingModule.instance.retrieveLogChannel('messageDeletes', message.guild);
    const lng = message.guild.preferredLocale;

    const parts = message.content.match(/\b[\w\s]{1024,}?(?=\s)|.+$/g) || [ message.content ];

    const embed = getEmbedWithTarget(message.author, lng)
        .setTitle(i18next.t('logging.messages.deletes.title', { lng: lng }))
        .setDescription(i18next.t('logging.messages.deletes.description', {
            lng: lng,
            userMention: message.author.toString(),
            channelMention: message.channel.toString()
        }))
        .setColor('Red')
        .setFooter({
            text: i18next.t('logging.messages.deletes.footer', {
                lng: lng,
                messageId: message.id,
                userId: message.author.id
            })
        });

    for (const part of parts) {
        embed.addFields([{
            name: i18next.t('logging.messages.deletes.fields.message.name', { lng: lng }),
            value: part
        }]);
    }

    await channel?.send({
        content: message.author.id,
        embeds: [ embed ]
    });
}
