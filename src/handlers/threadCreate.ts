import { ThreadChannel } from 'discord.js';
import LoggingModule from '../modules/logging/LoggingModule';

export async function onThreadCreate(thread: ThreadChannel, isNew: boolean) {
    // threadCreate is emitted for both newly created threads
    // AND when the client is added to a thread
    if(!isNew) { return; }
}
