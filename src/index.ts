import { Client, Intents } from 'discord.js';
import config from '../config.json';
import * as handlers from './handlers';

const client = new Client({intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS
]});

client.once('ready', () => console.log('Ready'));

client.on('guildMemberAdd', async (member) => {
    await handlers.onGuildMemberAdd(member);
});

client.on('guildMemberRemove', async (member) => {
    await handlers.onGuildMemberRemove(member);
});

client.on('guildMemberUpdate', async (before, after) => {
    await handlers.onGuildMemberUpdate(before, after);
});

client.login(config.token);
