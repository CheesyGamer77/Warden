import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from '@discordjs/builders';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { CommandInteraction } from 'discord.js';

abstract class CommandBase<BuilderType extends SlashCommandBuilder | SlashCommandSubcommandBuilder | SlashCommandSubcommandGroupBuilder> {
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
    abstract getData(): BuilderType
}

export abstract class SlashCommand extends CommandBase<SlashCommandBuilder> {
    private readonly dataBuilder: SlashCommandBuilder;
    private readonly subcommandGroups: Map<string, SubcommandGroup> = new Map();
    private readonly subcommands: Map<string, Subcommand> = new Map();

    constructor(name: string, description: string) {
        super(name, description);

        this.dataBuilder = new SlashCommandBuilder()
            .setName(name)
            .setDescription(description);
    }

    addSubcommandGroups(...groups: SubcommandGroup[]) {
        for(const group of groups) {
            this.dataBuilder.addSubcommandGroup(group.getData());
            this.subcommandGroups.set(group.getName(), group);
        }
    }

    addSubcommands(...subcommands: Subcommand[]) {
        for(const command of subcommands) {
            this.dataBuilder.addSubcommand(command.getData());
            this.subcommands.set(command.getName(), command);
        }
    }

    override getData() {
        return this.dataBuilder;
    }

    toJSON() {
        return this.dataBuilder.toJSON();
    }

    override async process(interaction: CommandInteraction) {
        if (interaction.commandName == this.name) {
            const subcommand = interaction.options.getSubcommand(false);
            const subcommandGroup = interaction.options.getSubcommandGroup(false);

            if (subcommandGroup == null && subcommand == null) {
                await this.invoke(interaction);
            }
            else if(subcommand != null) {
                await this.subcommands.get(subcommand)?.process(interaction)
            }
        }
    }
}

export abstract class Subcommand extends CommandBase<SlashCommandSubcommandBuilder> {
    private readonly dataBuilder: SlashCommandSubcommandBuilder;

    constructor(name: string, description: string) {
        super(name, description);
        this.dataBuilder = new SlashCommandSubcommandBuilder()
            .setName(name)
            .setDescription(description)
    }

    override getData() {
        return this.dataBuilder;
    }

    override async process(interaction: CommandInteraction) {
        if(interaction.isCommand()) {
            const name = interaction.options.getSubcommand();
            if(name == this.name) {
                await this.invoke(interaction)
            }
        }
    }
}

export abstract class SubcommandGroup extends CommandBase<SlashCommandSubcommandGroupBuilder> {
    private readonly dataBuilder: SlashCommandSubcommandGroupBuilder;
    private readonly subcommands: Map<string, Subcommand> = new Map();

    constructor(name: string, description: string) {
        super(name, description);
        this.dataBuilder = new SlashCommandSubcommandGroupBuilder()
            .setName(name)
            .setDescription(description);
    }

    addSubcommands(...subcommands: Subcommand[]) {
        for(const command of subcommands) {
            this.dataBuilder.addSubcommand(command.getData());
            this.subcommands.set(command.getName(), command);
        }
    }

    override getData() {
        return this.dataBuilder;
    }

    override async process(interaction: CommandInteraction) {
        if(interaction.isCommand()) {
            const name = interaction.options.getSubcommandGroup();
            const subcommandName = interaction.options.getSubcommand();

            if(name == this.name) {
                await this.subcommands.get(subcommandName)?.process(interaction);
            }
        }
    }

    override async invoke(_: CommandInteraction) {}
}
