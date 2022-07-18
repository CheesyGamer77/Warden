import { Formatters, GuildMember } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';
import { getEmbedWithTarget } from '../util/embed';

export default async function onGuildMemberAdd(member: GuildMember) {
    const channel = await LoggingModule.retrieveLogChannel('joins', member.guild);
    const lng = member.guild.preferredLocale;

    const user = member.user;

    const embed = getEmbedWithTarget(user, lng)
        .setTitle(i18next.t('logging.joins.title', { lng: lng }))
        .setDescription(i18next.t('logging.joins.description', {
            lng: lng,
            userMention: user.toString()
        }))
        .setColor('Green')
        .addField(
            i18next.t('logging.joins.fields.accountCreated.name', { lng: lng }),
            Formatters.time(user.createdAt, 'R')
        );

    await channel?.send({
        content: user.id,
        embeds: [ embed ],
    });
}
