import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export abstract class SlashCommandBase {
    protected readonly name: string;
    protected readonly description: string;

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    getName() {
        return this.name;
    }

    abstract process(interaction: CommandInteraction): Promise<void>
    abstract invoke(interaction: CommandInteraction): Promise<void>
}

export default abstract class extends SlashCommandBase {
    readonly dataBuilder: SlashCommandBuilder;

    constructor(name: string, description: string) {
        super(name, description);

        this.dataBuilder = new SlashCommandBuilder()
            .setName(name)
            .setDescription(description);
    }

    override async process(interaction: CommandInteraction) {
        if (interaction.commandName === this.name) {
            const subcommand = interaction.options.getSubcommand(false);
            const subcommandGroup = interaction.options.getSubcommandGroup(false);

            if (subcommandGroup === null && subcommand == null) {
                await this.invoke(interaction);
            }
        }
    }
}
