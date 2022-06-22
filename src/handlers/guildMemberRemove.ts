import LoggingModule from '../modules/logging/LoggingModule';
import { GuildMember, PartialGuildMember } from 'discord.js';

export default async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
    await LoggingModule.logMemberLeft(member);
}
