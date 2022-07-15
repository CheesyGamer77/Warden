import { SubcommandGroup } from '../../../util/commands/slash';
import DisableCommand from './disable';
import EnableCommand from './enable';

export default class NameSanitizerGroup extends SubcommandGroup {
    constructor() {
        super('name-sanitizer', 'Name sanititzer configuration');
        this.addSubcommands(
            new DisableCommand(),
            new EnableCommand()
        );
    }
}
