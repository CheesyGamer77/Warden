import { Collection, GuildMember, MessageEmbed, PartialGuildMember, Role } from 'discord.js';
import LoggingModule from '../modules/logging/LoggingModule';
import NameSanitizerModule from '../modules/automod/NameSanitizer';
import { getEmbedWithTarget } from '../util/embed';
import i18next from 'i18next';

function displayNameHasChanged(before: GuildMember, after: GuildMember) {
    return before.displayName != after.displayName;
}

function displayNameUpdateType(before: string | null, after: string | null): 'SET' | 'CHANGED' | 'CLEARED' {
    if (before == null && after != null) { return 'SET'; }
    else if (before != null && after == null) { return 'CLEARED'; }
    return 'CHANGED';
}

function getSortedRoleMentions(roles: Collection<string, Role>): string {
    return Array.from(
        roles.sorted((_, role) => role.position)
            .values())
        .map(role => `${role.toString()}`)
        .join(' ');
}

function getRoleUpdateEmbed(member: GuildMember, roles: Collection<string, Role>, action: 'add' | 'remove'): MessageEmbed {
    const lng = member.guild.preferredLocale;
    const user = member.user;

    let title, description;

    // TODO: i18next has a way of handling plurals for us instead
    const count = roles.size;
    if (count == 1) {
        title = i18next.t(`logging.userChanges.roles.${action}.single.title`, { lng: lng });
        description = i18next.t(`logging.userChanges.roles.${action}.single.description`, {
            lng: lng,
            userMention: user.toString()
        });
    }
    else {
        title = i18next.t(`logging.userChanges.roles.${action}.multi.title`, {
            lng: lng,
            count: count
        });
        description = i18next.t(`logging.userChanges.roles.${action}.multi.description`, {
            lng: lng,
            count: count
        });
    }

    return getEmbedWithTarget(member.user, lng)
        .setTitle(title)
        .setDescription(description)
        .setColor(action == 'add' ? 'GREEN' : 'RED')
        .addField(
            i18next.t('logging.userChanges.roles.common.fields.roles.name', { lng: lng }),
            getSortedRoleMentions(roles)
        );
}

export async function onGuildMemberUpdate(before: GuildMember | PartialGuildMember, after: GuildMember) {
    // don't compare uncached members to new state
    if (before.partial) return;

    const channel = await LoggingModule.fetchLogChannel('userChanges', after.guild);
    const lng = after.guild.preferredLocale;

    if (displayNameHasChanged(before, after)) {
        const oldNick = before.nickname;
        const newNick = after.nickname;
        const updateType = displayNameUpdateType(oldNick, newNick);

        // check if nickname was added, changed, or removed
        let title: string, action: string, color: number;
        let embed = getEmbedWithTarget(after.user, lng);
        if (updateType == 'SET') {
            // nickname set
            title = 'Nickname Set';
            action = 'set';
            color = 0x1f8b4c;

            embed.addField('Nickname', newNick ?? after.user.username);
        }
        else if (updateType == 'CLEARED') {
            // nickname cleared
            title = 'Nickname Cleared';
            action = 'cleared';
            color = 0xf1c40f;

            embed.addField('Original Nickname', oldNick ?? before.user.username);
        }
        else {
            // neither null guard clause
            if (oldNick === null || newNick === null) return;

            // nickname changed
            title = 'Nickname Changed';
            action = 'changed';
            color = 0x1abc9c;

            embed.addFields({
                name: 'Before',
                value: oldNick,
            },
            {
                name: 'After',
                value: newNick,
            });
        }

        embed = embed
            .setTitle(title)
            .setDescription(`${after.toString()} ${action} their nickname`)
            .setColor(color);

        await channel?.send({
            content: after.id,
            embeds: [ embed ],
        });

        // sanitize said nickname
        // TODO: add filter configuration for this
        await NameSanitizerModule.sanitize(after);
    }

    // check if roles were changed
    const oldRoles = before.roles.cache;
    const newRoles = after.roles.cache;
    if (oldRoles.difference(newRoles).size != 0) {
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        const embeds = [];
        if (addedRoles.size > 0) {
            embeds.push(getRoleUpdateEmbed(after, addedRoles, 'add'));
        }

        if (removedRoles.size > 0) {
            embeds.push(getRoleUpdateEmbed(after, removedRoles, 'remove'));
        }

        await channel?.send({
            content: after.id,
            embeds: embeds,
        });
    }

    // check guild avatar
    const avatarURL = after.displayAvatarURL();
    if (before.displayAvatarURL() != avatarURL) {
        const embed = getEmbedWithTarget(after.user, lng)
            .setTitle('Display Avatar Changed')
            .setDescription(`${after.toString()} had their display avatar changed`)
            .setColor(0xf1c40f)
            .setThumbnail(avatarURL);

        await channel?.send({
            content: after.id,
            embeds: [ embed ],
        });
    }
}
