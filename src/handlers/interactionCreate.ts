import { Interaction } from 'discord.js';
import { listener } from '../commands';

export default async function onInteractionCreate(interaction: Interaction) {
    if (interaction.isCommand()) {
        await listener.process(interaction);
    }
}
