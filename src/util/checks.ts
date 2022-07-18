/**
 * checks - Contains some commonly used checks
 */

import { GuildBasedChannel, GuildMember, Message, Permissions } from 'discord.js';

const flags = Permissions.FLAGS;

/**
 * Returns whether a given member is the owner of the provided guild
 * @param member The member to check if they're owner
 * @returns Whether the member is the owner of the guild or not
 */
export function isGuildOwner(member: GuildMember): boolean {
    return member.guild.ownerId == member.id;
}

/**
 * Returns whether a member has any of the following permissions:
 * - `MANAGE_MESSAGES`
 * - `MODERATE_MEMBERS`
 * - `KICK_MEMBERS`
 * - `BAN_MEMBERS`
 * @param member The member to check if they're considered to be a guild moderator
 * @returns Whether the member has any of the above permissions or not
 */
export function isGuildModerator(member: GuildMember): boolean {
    return member.permissions.any([
        flags.MANAGE_MESSAGES,
        flags.MODERATE_MEMBERS,
        flags.KICK_MEMBERS,
        flags.BAN_MEMBERS,
    ]);
}

/**
 * Returns whether a member can perform moderation actions on the given target, including changing nicknames, kicking, banning, etc.
 * This does not however take into account required permissions to perform said moderation actions.
 *
 * @param member The member doing the moderating
 * @param target The member to be moderated
 * @author ChessyGamer77, Ruelf
 * @returns Whether the member can moderate the target member
 */
export function canModerate(member: GuildMember | undefined | null, target: GuildMember): boolean {
    // same guild guard clause
    if (member?.guild != target.guild) return false;

    // moderate self guard clause
    if (member.id == target.id) return false;

    // owners can always moderate other members
    if (isGuildOwner(member)) return true;

    // but other members can never moderate owners
    if (isGuildOwner(target)) return false;

    // in all other cases, the ability to moderate depends on the member/target's top role position
    return member.roles.highest.position > target.roles.highest.position;
}

/**
 * Returns whether the client can send embeded messages in the given channel
 * @param channel The channel to check if the client can send embeded messages in
 */
export function canMessage(channel: GuildBasedChannel | null): boolean {
    const requiredPermissions = [
        flags.VIEW_CHANNEL,
        flags.SEND_MESSAGES,
        flags.EMBED_LINKS,
    ];

    return channel?.guild.me?.permissionsIn(channel).has(requiredPermissions) ?? false;
}

/**
 * Returns whether the bot can delete the specified message
 * @param message The message to be deleted
 * @returns Whether the message is able to be deleted by the bot or not
 */
export function canDelete(message: Message): boolean {
    if (message.channel.type == 'DM') {
        return message.author.id == message.client.user?.id ?? false;
    }

    return message.guild?.me?.permissionsIn(message.channel).has(flags.MANAGE_MESSAGES) ?? false;
}

/**
 * Returns whether the bot can purge messages from a specific channel
 * @param channel The channel to check if the bot can purge messages in
 * @returns Whether the bot can purge messages in the given channel or not
 */
export function canPurgeMessages(channel: GuildBasedChannel): boolean {
    return channel.guild.me?.permissionsIn(channel).has([
        flags.MANAGE_MESSAGES,
        flags.READ_MESSAGE_HISTORY,
    ]) ?? false;
}
