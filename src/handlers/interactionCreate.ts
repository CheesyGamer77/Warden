import { Interaction, InteractionType } from 'discord.js';
import { listener } from '../commands';

export default async function onInteractionCreate(interaction: Interaction) {
    if (interaction.type == InteractionType.ApplicationCommand) {
        await listener.process(interaction);
    }
}
