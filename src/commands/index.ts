import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';
import MuteCommand from './moderation/mute';

const listener = new CommandListener(
    new ConfigCommand(),
    new MuteCommand()
);

export { listener };
