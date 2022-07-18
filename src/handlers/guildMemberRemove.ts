import LoggingModule from '../modules/logging/LoggingModule';
import { Formatters, GuildMember, PartialGuildMember } from 'discord.js';
import { getEmbedWithTarget } from '../util/embed';
import i18next from 'i18next';

export default async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
    const channel = await LoggingModule.retrieveLogChannel('leaves', member.guild);
    const lng = member.guild.preferredLocale;

    const user = member.user;

    const embed = getEmbedWithTarget(user, lng)
        .setTitle(i18next.t('logging.leaves.title', { lng: lng }))
        .setDescription(i18next.t('logging.leaves.description', {
            lng: lng,
            userMention: user.toString()
        }))
        .setColor('Red');

    // a removed member's joined at timestamp has the potential to be null
    let memberSince: string;
    if (member.joinedAt != null) {
        memberSince = Formatters.time(member.joinedAt, 'R');
    }
    else {
        memberSince = i18next.t('logging.leaves.fields.memberSince.unknown');
    }

    embed.addField(
        i18next.t('logging.leaves.fields.memberSince.name'),
        memberSince
    );

    await channel?.send({
        content: user.id,
        embeds: [ embed ],
    });
}
