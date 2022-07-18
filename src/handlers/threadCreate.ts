import { EmbedBuilder, ThreadChannel } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';

export default async function onThreadCreate(thread: ThreadChannel, isNew: boolean) {
    // threadCreate is emitted for both newly created threads
    // AND when the client is added to a thread
    if (!isNew) { return; }

    const channel = await LoggingModule.retrieveLogChannel('threadEvents', thread.guild);
    const lng = thread.guild.preferredLocale;

    let ownerMention, ownerId = thread.ownerId;
    if (ownerId != null) {
        ownerMention = `<@${ownerId}>`;
    }
    else {
        ownerMention = '?';
        ownerId = ownerMention;
    }

    const parent = thread.parent;

    const embed = new EmbedBuilder()
        .setTitle(i18next.t('logging.threadEvents.create.title', { lng: lng }))
        .setDescription(i18next.t('logging.threadEvents.create.description', {
            lng: lng,
            ownerMention: ownerMention,
            threadMention: thread.toString(),
            channelMention: parent?.toString() ?? '?'
        }))
        .setColor('Green')
        .addFields({
            name: i18next.t('logging.threadEvents.create.fields.threadInfo.name', { lng: lng }),
            value: i18next.t('logging.threadEvents.create.fields.threadInfo.value', {
                lng: lng,
                threadName: thread.name,
                threadId: thread.id
            })
        }, {
            name: i18next.t('logging.threadEvents.create.fields.parentInfo.name', { lng: lng }),
            value: i18next.t('logging.threadEvents.create.fields.parentInfo.value', {
                lng: lng,
                parentName: parent?.name ?? '?',
                parentId: parent?.id ?? '?'
            })
        })
        .setFooter({
            text: i18next.t('logging.threadEvents.create.footer', {
                lng: lng,
                ownerId: ownerId,
                channelId: parent?.id ?? '?',
                threadId: thread.id
            })
        })
        .setTimestamp();

    await channel?.send({
        content: ownerId,
        embeds: [ embed ]
    });
}
