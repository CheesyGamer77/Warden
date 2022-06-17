import { MessageEmbed, ThreadChannel } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';

export async function onThreadUpdate(before: ThreadChannel, after: ThreadChannel) {
    const channel = await LoggingModule.retrieveLogChannel('threadEvents', after.guild);

    const lng = after.guild.preferredLocale;

    const footer = i18next.t('logging.threadEvents.update.name.footer', {
        lng: lng,
        threadId: after.id,
        channelId: after.parentId ?? 'Invalid Channel'
    });

    const embed = new MessageEmbed()
        .setFooter({ text: footer });

    // This is needed due to ThreadChannels having a nullable archived property.
    // This occurs in ThreadChannel delete events
    const wasArchived = before.archived ?? false;
    const isArchived = after.archived ?? false;

    // check name
    if (before.name !== after.name) {
        embed
            .setTitle(i18next.t('logging.threadEvents.update.name.title', { lng: lng }))
            .setDescription(i18next.t('logging.threadEvents.update.name.description', {
                lng: lng,
                threadMention: after.toString()
            }))
            .setColor('YELLOW')
            .addFields(
                {
                    name: i18next.t('logging.threadEvents.update.name.fields.before.name'),
                    value: before.name
                },
                {
                    name: i18next.t('logging.threadEvents.update.name.fields.after.name'),
                    value: after.name
                }
            );
    }
    else if (!wasArchived && isArchived) {
        embed
            .setTitle(i18next.t('logging.threadEvents.update.archived.title', { lng: lng }))
            .setDescription(i18next.t('logging.threadEvents.update.archived.description', {
                lng: lng,
                threadName: after.name
            }))
            .setColor('ORANGE');
    }
    else if (wasArchived && !isArchived) {
        embed
            .setTitle(i18next.t('logging.threadEvents.update.unarchived.title', { lng: lng }))
            .setDescription(i18next.t('logging.threadEvents.update.unarchived.description', {
                lng: lng,
                threadName: after.name
            }))
            .setColor('AQUA');
    }
    else {
        return;
    }

    await channel?.send({
        content: after.id,
        embeds: [ embed ]
    });
}
