import { Formatters, GuildMember } from 'discord.js';
import i18next from 'i18next';
import LoggingModule from '../modules/logging/LoggingModule';
import { getEmbedWithTarget } from '../util/embed';

export default async function onGuildMemberAdd(member: GuildMember) {
    const channel = await LoggingModule.instance.retrieveLogChannel('joins', member.guild);
    const lng = member.guild.preferredLocale;

    const embed = getEmbedWithTarget(member, lng)
        .setTitle(i18next.t('logging.joins.title', { lng: lng }))
        .setDescription(i18next.t('logging.joins.description', {
            lng: lng,
            userMention: member.toString()
        }))
        .setColor('Green')
        .addFields([{
            name: i18next.t('logging.joins.fields.accountCreated.name', { lng: lng }),
            value: Formatters.time(member.user.createdAt, 'R')
        }]);

    await channel?.send({
        content: member.id,
        embeds: [ embed ],
    });
}
