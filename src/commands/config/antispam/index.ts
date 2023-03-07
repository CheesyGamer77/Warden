import { SubcommandGroup } from '../../../util/commands/slash';
import DisableCommand from './disable';
import EnableCommand from './enable';
import ViewCommand from './view';

export default class AntispamGroup extends SubcommandGroup {
    constructor() {
        super('antispam', 'Antispam configuration');
        this.addSubcommands(
            new DisableCommand(),
            new EnableCommand(),
            new ViewCommand()
        );
    }
}
