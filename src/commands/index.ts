import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';
import MuteCommand from './moderation/mute';
import Warden from '../warden';
import { Client } from 'discord.js';

const listener = new CommandListener(
    new ConfigCommand(),
    new MuteCommand()
);

export async function updateCommands(client: Client) {
    const commands = listener.getCommands();

    await client.application?.commands.set(commands);

    Warden.logger.debug(`Updated ${commands.length} commands`);
}

export {
    listener
};
