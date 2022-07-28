import { PrismaClient } from '@prisma/client';
import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import i18next from 'i18next';
import { PermissionLockedSlashCommand } from '../../util/commands/slash';
import { getEmbedWithTarget } from '../../util/embed';

const prisma = new PrismaClient();

export default class CaseCommand extends PermissionLockedSlashCommand {
    constructor() {
        super('case', 'Displays information about a particular mod log case', PermissionFlagsBits.ManageGuild);

        this.dataBuilder.addIntegerOption(option => option
            .setName('number')
            .setDescription('The case number of the case to view information of')
            .setRequired(true)
            .setMinValue(1)
        );
    }

    override async invoke(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild;
        if (guild == null) return;

        const lng = guild.preferredLocale;

        const caseLog = await prisma.modActions.findUnique({
            where: {
                guildId_caseNumber: {
                    guildId: guild.id,
                    caseNumber: interaction.options.getInteger('number', true)
                }
            }
        });

        if (caseLog == null) {
            await interaction.reply({
                embeds: [ new EmbedBuilder()
                    .setDescription(i18next.t('commands.case.fail.notFound', { lng: lng }))
                    .setColor('Red')
                ] });

            return;
        }

        // the database has no means of knowing if a user ID is always valid,
        // so we just remove the author field if the fetched target user is invalid,
        // in addition we will just keep the footer field regardless of the validity
        let baseEmbed;
        try {
            const user = await interaction.client.users.fetch(caseLog.offenderId);
            baseEmbed = getEmbedWithTarget(user, lng);
        }
        catch (error) {
            baseEmbed = new EmbedBuilder()
                .setFooter(i18next.t('logging.common.footer', {
                    lng: lng,
                    userId: caseLog.offenderId
                }));
        }

        await interaction.reply({
            content: caseLog.offenderId,
            embeds: [ baseEmbed
                .setDescription(i18next.t('commands.case.success.'))
                .setColor('Green')
            ] });
    }
}
