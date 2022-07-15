import { LogConfig } from '@prisma/client';
import { SubcommandGroup } from '../../../util/commands/slash';
import SetCommand from './set';
import ViewCommand from './view';

export type LogConfigKeys = keyof Omit<LogConfig, 'guildId'>;

/**
 * `/config modlogs` subcommand - Allows for the configuration of moderation logs.
 */
export default class ModlogsGroup extends SubcommandGroup {
    static readonly logTypeChoices = [
        { name: 'Auto-mod Escalations', value: 'escalationsChannelId' },
        { name: 'Member Joins', value: 'joinsChannelId' },
        { name: 'Member Leaves', value: 'leavesChannelId' },
        { name: 'Profile Filter', value: 'userFilterChannelId' },
        { name: 'Profile Changes', value: 'userChangesChannelId' },
        { name: 'Text Filter', value: 'textFilterChannelId' },
        { name: 'Message Deletes', value: 'messageDeletesChannelId' },
        { name: 'Message Edits', value: 'messageEditsChannelId' },
        { name: 'Thread Channel Events', value: 'threadEventsChannelId' },
        { name: 'Moderator Actions', value: 'modActionsChannelId' },
        { name: 'Voice Chat Events', value: 'voiceEventsChannelId' }
    ];

    constructor() {
        super('modlogs', 'Moderation log configuration');
        this.addSubcommands(
            new SetCommand(),
            new ViewCommand()
        );
    }
}
