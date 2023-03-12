import { SubcommandGroup } from 'cheesyutils.js';
import { ChatInputCommandInteraction } from 'discord.js';
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

    // eslint-disable-next-line
    override async invoke(ctx: ChatInputCommandInteraction){}
}
