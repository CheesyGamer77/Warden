import { Message } from 'discord.js';
import AntiSpamModule from '../modules/automod/AntiSpam';

export default async function onMessageCreate(message: Message) {
    await AntiSpamModule.process(message);
}
