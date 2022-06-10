import { Client, GuildMember, Intents, Message, PartialGuildMember, PartialMessage } from 'discord.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import config from '../config.json';
import * as handlers from './handlers';

const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
] });

client.once('ready', () => console.log('Ready'));

client.on('guildMemberAdd', async (member) => await handlers.onGuildMemberAdd(member));

client.on('guildMemberRemove', async (member) => await handlers.onGuildMemberRemove(member));

// TODO: This is stupid. These type definitions are (supposed to be) redundant, but if you don't supply them, VSC IS screams at you
client.on('guildMemberUpdate', async (before: GuildMember | PartialGuildMember, after: GuildMember) =>
    await handlers.onGuildMemberUpdate(before, after));

client.on('messageCreate', async (message) => await handlers.onMessageCreate(message));

// TODO: This is stupid. These type definitions are (supposed to be) redundant, but if you don't supply them, VSC IS screams at you
client.on('messageUpdate', async (before: Message | PartialMessage, after: Message | PartialMessage) =>
    await handlers.onMessageUpdate(before, after));

client.on('messageDelete', async (message) => await handlers.onMessageDelete(message));

i18next.use(Backend).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    cleanCode: true,
    backend: {
        loadPath: './locales/{{lng}}/translation.json'
    }
}).then(() => client.login(config.token));
