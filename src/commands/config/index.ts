import { CommandInteraction, Permissions } from 'discord.js';
import { SlashCommand } from '../../util/commands/slash';

/**
 * `/config` command - Allows for guild configuration customization.
 *
 * This requires `MANAGE_GUILD` permissions in order to be used.
 */
export default class ConfigCommand extends SlashCommand {
    constructor() {
        super('config', 'Configuration commands');
        this.dataBuilder.setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_GUILD);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override async invoke(_: CommandInteraction) { return; }
}
