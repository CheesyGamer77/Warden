import { MessageEmbed, ThreadChannel } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';

export async function onThreadDelete(thread: ThreadChannel) {
    const channel = await LoggingModule.retrieveLogChannel('threadEvents', thread.guild);

    const lng = thread.guild.preferredLocale;

    const embed = new MessageEmbed()
        .setTitle(i18next.t('logging.threadEvents.delete.title', { lng: lng }))
        .setDescription(i18next.t('logging.threadEvents.delete.description', {
            lng: lng,
            threadName: thread.name
        }))
        .setColor('RED')
        .setFooter({
            text: i18next.t('logging.threadEvents.delete.footer', {
                lng: lng,
                threadId: thread.id,
                channelId: thread.parentId ?? 'Invalid Parent Channel'
            }) })
        .setTimestamp();

    await channel?.send({
        content: thread.id,
        embeds: [ embed ]
    });
}