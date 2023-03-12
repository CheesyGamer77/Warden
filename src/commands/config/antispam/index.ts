import { SubcommandGroup } from 'cheesyutils.js';
import { ChatInputCommandInteraction } from 'discord.js';
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

    // eslint-disable-next-line
    override async invoke(ctx: ChatInputCommandInteraction) {}
}
