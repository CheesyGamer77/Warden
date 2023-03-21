import { GuildSlashCommand } from 'cheesyutils.js';
import { ChatInputCommandInteraction } from 'discord.js';

export abstract class PermissionLockedSlashCommand extends GuildSlashCommand {
    constructor(name: string, description: string, permissions: string | number | bigint | null | undefined) {
        super(name, description);
        this.data.setDefaultMemberPermissions(permissions);
    }

    // TODO: This should be redundant
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected botHasPermissions(_: ChatInputCommandInteraction) {
        return true;
    }
}
