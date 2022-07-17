import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import Warden from '../warden';

const listener = new CommandListener(
    new ConfigCommand()
);

export async function updateCommands(token: string, clientId: string) {
    const commands = listener.getCommands();

    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    Warden.logger.debug(`Updated ${commands.length} commands`);
}

export {
    listener
};
