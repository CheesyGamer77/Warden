import { GuildMember, Permissions } from 'discord.js';
import replacements from '../../../data/fancy_replacements.json'
import { getEmbedWithTarget } from '../../util/EmbedUtil';
import LoggingModule, { LogEventType } from '../logging/LoggingModule';

let fancy_replacements = new Map<string, string>();
for(const pair of Object.entries(replacements)) {
    fancy_replacements.set(pair[0], pair[1]);
}

export default class NameSanitizerModule {
    private static cleanFancyText(content: string): string {
        let sanitized = "";

        for(const char of content) {
            sanitized = sanitized.concat(fancy_replacements.get(char) ?? char);
        }

        return sanitized;
    }

    private static canOverwriteName(member: GuildMember): boolean {
        return member.guild.me?.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES) ?? false;
    }

    /**
     * Sanitizes a member's display name to remove zalgo and "fancy text"
     * @param member The member who's name should be sanitized
     */
    static async sanitize(member: GuildMember) {
        const channel = await LoggingModule.fetchLogChannel(LogEventType.USER_FILTER, member.guild);
        if(channel == null) return;

        const name = member.displayName;
        let sanitized = this.cleanFancyText(name);
        const reason = 'Sanitizing Nickname';
        if(name != sanitized && this.canOverwriteName(member)) {
            if(sanitized.trim() === '') sanitized = "Nickname";

            await member.edit({ nick: sanitized }, reason);

            await channel.send({
                content: member.id,
                embeds: [
                    getEmbedWithTarget(member.user)
                        .setTitle('Nickname Filtered')
                        .setDescription(member.toString() + ' had their display name filtered')
                        .setColor(0xfee75c)
                        .addField('Before', name)
                        .addField('After', sanitized)
                        .addField('Reason', reason)
                ]
            });
        }
    }
}