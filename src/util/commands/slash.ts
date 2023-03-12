import { SlashCommand } from 'cheesyutils.js';
import { ChatInputCommandInteraction } from 'discord.js';

export abstract class GuildSlashCommand extends SlashCommand {
    constructor(name: string, description: string) {
        super(name, description);
        this.data.setDMPermission(false);
    }
}

export abstract class PermissionLockedSlashCommand extends GuildSlashCommand {
    constructor(name: string, description: string, permissions: string | number | bigint | null | undefined) {
        super(name, description);
        this.data.setDefaultMemberPermissions(permissions);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected botHasPermissions(_: ChatInputCommandInteraction) {
        return true;
    }
}
