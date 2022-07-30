import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';
import MuteCommand from './moderation/mute';
import Warden from '../warden';
import { Client } from 'discord.js';
import KickCommand from './moderation/kick';
import BanCommand from './moderation/ban';
import UnbanCommand from './moderation/unban';
import CaseCommand from './moderation/case';
import WarnCommand from './moderation/warn';

const listener = new CommandListener(
    new BanCommand(),
    new CaseCommand(),
    new ConfigCommand(),
    new KickCommand(),
    new MuteCommand(),
    new UnbanCommand(),
    new WarnCommand()
);

export async function updateCommands(client: Client) {
    const commands = listener.getCommands();

    await client.application?.commands.set(commands);

    Warden.logger.debug(`Updated ${commands.length} commands`);
}

export {
    listener
};
