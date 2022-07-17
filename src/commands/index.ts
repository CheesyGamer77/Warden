import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const listener = new CommandListener(
    new ConfigCommand()
);

export async function updateCommands(token: string, clientId: string) {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), { body: listener.getCommands() });
}

export {
    listener
};
