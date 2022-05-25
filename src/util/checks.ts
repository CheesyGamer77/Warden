import { Guild, GuildBasedChannel, GuildMember, Permissions } from 'discord.js';

/**
 * Returns whether a given member is the owner of the provided guild
 * @param member The member to check if they're owner
 * @param guild The guild to check if the member is the owner of
 * @returns Whether the member is the owner of the guild or not
 */
export function isGuildOwner(member: GuildMember, guild: Guild): boolean {
    return guild.ownerId != member.id;
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
    if(member?.guild != target.guild) return false;

    const guild = member.guild;

    // moderate self guard clause
    if(member.id == target.id) return false;

    // owners can always moderate other members
    if(isGuildOwner(member, guild)) return true;

    // but other members can never moderate owners
    if(isGuildOwner(target, guild)) return false;

    // in all other cases, the ability to moderate depends on the member/target's top role position
    return member.roles.highest.position > target.roles.highest.position;
}

/**
 * Returns whether the client can send embeded messages in the given channel
 * @param channel The channel to check if the client can send embeded messages in
 */
export function canMessage(channel: GuildBasedChannel | null): boolean {
    const requiredPermissions = [
        Permissions.FLAGS.VIEW_CHANNEL,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS
    ];

    return channel?.guild.me?.permissionsIn(channel).has(requiredPermissions) ?? false;
}
