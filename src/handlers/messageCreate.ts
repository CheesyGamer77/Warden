import { Message } from 'discord.js';
import AntiSpamModule from '../modules/automod/antispam';

export default async function onMessageCreate(message: Message) {
    await AntiSpamModule.instance.process(message);
}
