import { CommandInteraction } from 'discord.js';
import { SlashCommand } from '../../util/commands/slash';

export default class ConfigCommand extends SlashCommand {
    constructor() {
        super('config', 'Configuration commands');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override async invoke(_: CommandInteraction) { return; }
}
