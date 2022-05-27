import { Message } from 'discord.js';
import AntiSpamModule from '../modules/automod/AntiSpam';

export async function onMessageCreate(message: Message) {
    await AntiSpamModule.process(message);
}
