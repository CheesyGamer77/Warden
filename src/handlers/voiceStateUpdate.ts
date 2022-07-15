import { MessageEmbed, VoiceState } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';
import { getEmbedWithTarget } from '../util/embed';

type State = 'JOINED' | 'MOVED' | 'LEFT';

function getVoiceState(before: VoiceState, after: VoiceState): State {
    if (before.channel == null && after.channel != null) {
        return 'JOINED';
    }
    else if (before.channel != null && after.channel != null) {
        return 'MOVED';
    }
    else {
        return 'LEFT';
    }
}

export default async function onVoiceStateUpdate(before: VoiceState, after: VoiceState) {
    const logChannel = await LoggingModule.retrieveLogChannel('voiceEvents', after.guild);
    const lng = after.guild.preferredLocale;

    // prevent null after members
    const member = after.member;
    if (member == null) { return; }

    const state = getVoiceState(before, after);
    let embed: MessageEmbed;

    if (state == 'JOINED') {
        const channel = after.channel;

        embed = getEmbedWithTarget(member.user, lng)
            .setTitle(i18next.t('logging.voiceEvents.joins.title', { lng: lng }))
            .setDescription(i18next.t('logging.voiceEvents.joins.description', {
                lng: lng,
                userMention: member.toString(),
                channelMention: channel?.toString()
            }))
            .setColor('GREEN')
            .setFooter({ text: i18next.t('logging.voiceEvents.joins.footer', {
                lng: lng,
                userId: member.id,
                channelId: channel?.id
            }) });
    }
    else if (state == 'MOVED') {
        const from = before.channel;
        const to = after.channel;

        // ensure `from` and `to` aren't the same channel (#32)
        if (from != null && to != null && from.id == to.id) return;

        embed = getEmbedWithTarget(member.user, lng)
            .setTitle(i18next.t('logging.voiceEvents.moves.title', { lng: lng }))
            .setDescription(i18next.t('logging.voiceEvents.moves.description', {
                lng: lng,
                userMention: member.toString()
            }))
            .setColor('YELLOW')
            .addFields([
                {
                    name: i18next.t('logging.voiceEvents.moves.fields.from.name', { lng: lng }),
                    value: `${from?.toString()} (\`${from?.id}\`)`
                },
                {
                    name: i18next.t('logging.voiceEvents.moves.fields.to.name', { lng: lng }),
                    value: `${to?.toString()} (\`${to?.id}\`)`
                }
            ])
            .setFooter({ text: i18next.t('logging.voiceEvents.moves.footer', {
                lng: lng,
                userId: member.id
            }) });
    }
    else {
        const channel = before.channel;

        embed = getEmbedWithTarget(member.user, lng)
            .setTitle(i18next.t('logging.voiceEvents.leaves.title', { lng: lng }))
            .setDescription(i18next.t('logging.voiceEvents.leaves.description', {
                lng: lng,
                userMention: member.toString(),
                channelMention: before.channel?.toString()
            }))
            .setColor('RED')
            .setFooter({ text: i18next.t('logging.voiceEvents.leaves.footer', {
                lng: lng,
                userId: member.id,
                channelId: channel?.id
            }) });
    }

    await logChannel?.send({
        content: member.id,
        embeds: [ embed ]
    });
}
