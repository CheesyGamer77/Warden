import { REST } from '@discordjs/rest';
import { Client, GuildMember, Intents, Message, PartialGuildMember, PartialMessage, ThreadChannel, VoiceState } from 'discord.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import config from '../config.json';
import * as handlers from './handlers';
import { Routes } from 'discord-api-types/v10';
import * as commands from './commands';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';

const client = new Client({ intents: [
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

(async () => {
    const token = config.token;

    // translations
    await i18next.use(Backend).init({
        lng: 'en-US',
        fallbackLng: 'en-US',
        cleanCode: true,
        backend: {
            loadPath: './locales/{{lng}}/translation.json'
        }
    });

    // update commands
    const cachePath = './warden.commands.cache';

    // generate hash of current command content
    const body = commands.listener.getCommands();
    const commandsHash = createHash('MD5').update(body.toString()).digest('hex');

    // read local hash if able
    const localHash = await fs.readFile(cachePath, { encoding: 'utf8', flag: 'r+' });

    if (commandsHash !== localHash) {
        await fs.writeFile(cachePath, commandsHash);

        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(config.clientId), { body: body });

        console.log(`Updated ${body.length} slash commands`);
    }
    else {
        console.log('Skipping commands update due to no local changes');
    }

    // login
    await client.login(token);
})();
