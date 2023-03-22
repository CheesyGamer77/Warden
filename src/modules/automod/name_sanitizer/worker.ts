import { NameSanitizerConfig } from '@prisma/client';
import { Colors } from 'discord.js';
import i18next from 'i18next';
import { AutoModContext, AutoModWorker, ContentSeverity, WorkerResults, WorkerSendResultsOpts } from '..';
import { canOverwriteName } from '../../../util/checks';
import { getEmbedWithTarget } from '../../../util/embed';
import { LogEventType } from '../../logging/LoggingModule';
import { replaceFancyCharacters } from './sanitizers';

type NameSantizerContext = AutoModContext<string, NameSanitizerConfig> & {
    before: string
}

type NameSanitizerResults = WorkerResults<string, NameSanitizerConfig, NameSantizerContext> & {
    sanitized: string
};

export class NameSanitizerWorker extends AutoModWorker<string, NameSanitizerConfig, NameSantizerContext, NameSanitizerResults> {
    protected async run(ctx: NameSantizerContext): Promise<NameSanitizerResults> {
        const name = ctx.content;
        let sanitized = name;

        if (ctx.config.cleanFancyCharacters) {
            sanitized = replaceFancyCharacters(name);
        }

        // cleanup any remaining whitespace, set to fallback name if empty
        sanitized = sanitized.trim();
        sanitized = sanitized.length === 0 ? ctx.config.blankFallbackName : sanitized;

        let severity = ContentSeverity.SAFE;
        let moderated = false;
        if (name !== sanitized && canOverwriteName(ctx.member)) {
            severity = ContentSeverity.GREY_ZONE;
            moderated = true;
        }

        return {
            ctx,
            moderated,
            severity,
            sanitized
        };
    }

    override async runPrechecks(ctx: NameSantizerContext) {
        return canOverwriteName(ctx.member);
    }

    protected override getName(): string {
        // TODO: Localize
        return 'Name Sanitizer';
    }

    protected override getLogChannelKey(): LogEventType {
        return 'userFilter';
    }

    protected override async runEscalations(ctx: NameSantizerContext, results: NameSanitizerResults) {
        await ctx.member.edit({
            nick: results.sanitized,
            reason: i18next.t('logging.automod.nameSanitizer.filtered.reason', { lng: ctx.guild.preferredLocale })
        });
    }

    protected async sendResults(opts: WorkerSendResultsOpts<string, NameSanitizerConfig, NameSantizerContext, NameSanitizerResults>): Promise<void> {
        const { results, channel } = opts;
        const member = results.ctx.member;
        const lng = results.ctx.guild.preferredLocale;
        const reason = i18next.t('logging.automod.nameSanitizer.filtered.reason', { lng: lng });

        if (results.moderated) {
            await channel.send({
                content: member.id,
                embeds: [ getEmbedWithTarget(member, lng)
                    .setTitle(i18next.t('logging.automod.nameSanitizer.filtered.title', { lng }))
                    .setDescription(
                        i18next.t('logging.automod.nameSanitizer.filtered.description', {
                            lng,
                            userMention: member.toString()
                        }))
                    .setColor(Colors.Yellow)
                    .addFields(
                        {
                            'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.before.name', { lng }),
                            'value': results.ctx.before,
                        },
                        {
                            'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.after.name', { lng }),
                            'value': results.sanitized
                        },
                        {
                            'name': i18next.t('logging.automod.nameSanitizer.filtered.fields.reason.name', { lng }),
                            'value': reason
                        }
                    )
                ]
            });
        }
        else {
            const testText = i18next.t('logging.automod.test', { lng });
            await channel.send({
                content: results.ctx.isTest ? testText : results.ctx.member.id,
                embeds: [ getEmbedWithTarget(member, lng)
                    .setTitle(testText)
                    .setDescription(i18next.t('logging.automod.nameSanitizer.safe.description', { lng }))
                    .setColor(this.getSeverityColor(results.severity))
                    .setFooter({ text: testText })
                    .addFields([{
                        name: i18next.t('logging.automod.nameSanitizer.safe.fields.nickname.name', { lng }),
                        value: results.ctx.content
                    }])
                ]
            });
        }
    }
}
