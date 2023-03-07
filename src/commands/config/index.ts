import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from '../../util/commands/slash';
import AntispamGroup from './antispam';
import ModlogsGroup from './modlogs';
import NameSanitizerGroup from './name-sanitizer';

/**
 * `/config` command - Allows for guild configuration customization.
 *
 * This requires `MANAGE_GUILD` permissions in order to be used.
 */
export default class ConfigCommand extends SlashCommand {
    constructor() {
        super('config', 'Configuration commands');
        this.dataBuilder.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
        this.addSubcommandGroups(
            new AntispamGroup(),
            new ModlogsGroup(),
            new NameSanitizerGroup()
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override async invoke(_: ChatInputCommandInteraction) { return; }
}
