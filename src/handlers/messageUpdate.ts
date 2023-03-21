import { Message, PartialMessage } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';
import { getEmbedWithTarget } from '../util/embed';

export default async function onMessageUpdate(before: Message | PartialMessage, after: Message | PartialMessage) {
    // only track message content updates and non-partial after messages
    if (before.content === after.content || after.partial) return;

    if (!after.inGuild()) return;

    if (before.content == null || after.content == null) return;

    const channel = await LoggingModule.instance.retrieveLogChannel('messageEdits', after.guild);
    const lng = after.guild.preferredLocale;

    const embed = getEmbedWithTarget(after.member ?? after.author, lng)
        .setTitle(i18next.t('logging.messages.edits.title', { lng: lng }))
        .setDescription(i18next.t('logging.messages.edits.description', {
            lng: lng,
            messageURL: after.url,
            userMention: after.author.toString(),
            channelMention: after.channel.toString()
        }))
        .setColor('Yellow')
        .addFields([
            {
                name: i18next.t('logging.messages.edits.fields.before.name', { lng: lng }),
                value: before.content
            },
            {
                name: i18next.t('logging.messages.edits.fields.after.name', { lng: lng }),
                value: after.content
            }
        ])
        .setFooter({
            text: i18next.t('logging.messages.edits.footer', {
                lng: lng,
                messageId: after.id,
                userId: after.author.id
            })
        });

    await channel?.send({
        content: after.author.id,
        embeds: [ embed ]
    });
}
