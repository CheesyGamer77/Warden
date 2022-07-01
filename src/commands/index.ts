import CommandListener from '../util/commands/CommandListener';
import ConfigCommand from './config';

const listener = new CommandListener(
    new ConfigCommand()
);

export { listener };
