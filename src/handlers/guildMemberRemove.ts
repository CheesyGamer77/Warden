import LoggingModule from "../modules/logging/LoggingModule";
import { getEmbedWithTarget } from "../util/EmbedUtil";
import { GuildMember, Formatters, PartialGuildMember } from "discord.js";

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
    const channel = await LoggingModule.fetchLogChannel('leaves', member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Left')
        .setDescription(user.toString() + ' left the server')
        .setColor(0xed4245)

    // a removed member's joined at timestamp has the potential to be null
    let memberSince: string;
    if(member.joinedAt != null)
        memberSince = Formatters.time(member.joinedAt, 'R');
    else
        memberSince = 'Unknown';

    embed.addField('Member Since', memberSince);

    await channel?.send({
        content: user.id,
        embeds: [ embed ]
    });
}
