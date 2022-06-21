import { Message, PartialMessage } from 'discord.js';
import LoggingModule from '../modules/logging/LoggingModule';

export default async function onMessageDelete(message: Message | PartialMessage) {
    if (message.partial) { return; }

    await LoggingModule.logMessageDelete(message);
}
