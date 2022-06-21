import CommandListener from '../util/commands/CommandListener';
import PingCommand from './ping';

const listener = new CommandListener(
    new PingCommand()
);

export { listener };
