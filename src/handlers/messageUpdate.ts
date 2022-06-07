import { Message, PartialMessage } from 'discord.js';
import LoggingModule from '../modules/logging/LoggingModule';

export async function onMessageUpdate(before: Message | PartialMessage, after: Message | PartialMessage) {
    // only track message content updates and non-partial after messages
    if (before.content === after.content || after.partial || after.guild == null) { return; }

    await LoggingModule.logMessageEdit(before, after);
}
