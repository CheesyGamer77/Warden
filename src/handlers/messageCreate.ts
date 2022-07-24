import { Message } from 'discord.js';
import AntiSpam from '../modules/automod/runners/antispam';

export default async function onMessageCreate(message: Message) {
    await AntiSpam.process(message);
}
