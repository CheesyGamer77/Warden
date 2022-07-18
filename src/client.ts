/**
 * Client - Defines the discord.js client to use to connect to Discord
 *
 * This mostly contains `client.on` definitions that get very cluttery
 */

import { Client, GuildMember, Intents, Message, PartialGuildMember, PartialMessage, ThreadChannel, VoiceState } from 'discord.js';
import * as handlers from './handlers';

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_VOICE_STATES
    ] });

client.once('ready', () => console.log('Ready'));

client.on('guildMemberAdd', async (member) => await handlers.onGuildMemberAdd(member));

client.on('guildMemberRemove', async (member) => await handlers.onGuildMemberRemove(member));

// TODO: This is stupid. These type definitions are (supposed to be) redundant, but if you don't supply them, VSC IS screams at you
client.on('guildMemberUpdate', async (before: GuildMember | PartialGuildMember, after: GuildMember) =>
    await handlers.onGuildMemberUpdate(before, after));

client.on('interactionCreate', async (interaction) => await handlers.onInteractionCreate(interaction));

client.on('messageCreate', async (message) => await handlers.onMessageCreate(message));

client.on('messageDelete', async (message) => await handlers.onMessageDelete(message));

// TODO: See above
client.on('messageUpdate', async (before: Message | PartialMessage, after: Message | PartialMessage) =>
    await handlers.onMessageUpdate(before, after));

// TODO: See above
client.on('threadCreate', async (thread: ThreadChannel, isNew: boolean) => await handlers.onThreadCreate(thread, isNew));

client.on('threadDelete', async (thread) => await handlers.onThreadDelete(thread));

// TODO: See above
client.on('threadUpdate', async (before: ThreadChannel, after: ThreadChannel) => await handlers.onThreadUpdate(before, after));

// TODO: See above
client.on('voiceStateUpdate', async (before: VoiceState, after: VoiceState) => await handlers.onVoiceStateUpdate(before, after));

export default client;
