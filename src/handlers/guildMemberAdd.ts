import { GuildMember } from 'discord.js';
import LoggingModule from '../modules/logging/LoggingModule';

export default async function onGuildMemberAdd(member: GuildMember) {
    await LoggingModule.logMemberJoined(member);
}
