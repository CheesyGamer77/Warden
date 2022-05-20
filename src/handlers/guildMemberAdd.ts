import { GuildMember, Formatters } from "discord.js";
import LoggingModule from "../modules/logging/LoggingModule";
import { getEmbedWithTarget } from "../util/EmbedUtil";

export async function onGuildMemberAdd(member: GuildMember) {
    const channel = await LoggingModule.fetchLogChannel('joins', member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Joined')
        .setDescription(user.toString() + ' joined the server')
        .setColor(0x1f8b4c)
        .addField('Account Created', Formatters.time(user.createdAt, 'R'))

    await channel?.send({
        content: user.id,
        embeds: [ embed ] 
    });
}