import { Client, Formatters, Intents, Role } from 'discord.js';
import config from '../config.json';
import NameSanitizerModule from './modules/automod/NameSanitizer';
import LoggingModule from './modules/logging/LoggingModule';
import { getEmbedWithTarget } from './util/EmbedUtil';

const client = new Client({intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS
]});

client.once('ready', () => console.log('Ready'));

client.on('guildMemberAdd', async (member) => {
    const channel = await LoggingModule.fetchLogChannel('joins', member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Joined')
        .setDescription(user.toString() + ' joined the server')
        .setColor(0x1f8b4c)
        .addField('Account Created', Formatters.time(user.createdAt, 'R'))

    await channel?.send({
        content: user.id,
        embeds: [ embed ] 
    });
});

client.on('guildMemberRemove', async (member) => {
    const channel = await LoggingModule.fetchLogChannel('leaves', member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Left')
        .setDescription(user.toString() + ' left the server')
        .setColor(0xed4245)
    
    // a removed member's joined at timestamp has the potential to be null
    let memberSince: string;
    if(member.joinedAt != null)
        memberSince = Formatters.time(member.joinedAt, 'R');
    else
        memberSince = 'Unknown';
    
    embed.addField('Member Since', memberSince);

    await channel?.send({
        content: user.id,
        embeds: [ embed ]
    });
});

client.on('guildMemberUpdate', async (before, after) => {
    // don't compare uncached members to new state
    if(before.partial) return;

    const channel = await LoggingModule.fetchLogChannel('userChanges', after.guild);

    // check nickname
    if(before.displayName != after.displayName) {
        // check if nickname was added, changed, or removed
        const username = after.user.username;
        const oldNick = before.displayName === username ? null : before.displayName;
        const newNick = after.displayName === username ? null : after.displayName;

        let title: string, action: string, color: number;
        let embed = getEmbedWithTarget(after.user);
        if(oldNick == null && newNick != null) {
            // nickname added
            title = 'Nickname Set';
            action = 'set';
            color = 0x1f8b4c;

            embed.addField('Nickname', newNick);
        }
        else if(oldNick != null && newNick == null) {
            // nickname cleared
            title = 'Nickname Cleared'
            action = 'cleared';
            color = 0xf1c40f;

            embed.addField('Original Nickname', oldNick);
        }
        else {
            // neither null guard clause
            if(oldNick === null || newNick === null) return;

            // nickname changed
            title = 'Nickname Changed';
            action = 'changed';
            color = 0x1abc9c;

            embed.addFields({
                name: 'Before',
                value: oldNick
            },
            {
                name: 'After',
                value: newNick
            });
        }

        embed = embed
            .setTitle(title)
            .setDescription(`${after.toString()} ${action} their nickname`)
            .setColor(color);
            
        await channel?.send({
            content: after.id,
            embeds: [ embed ]
        });

        // sanitize said nickname
        await NameSanitizerModule.sanitize(after);
    }

    // check if roles were changed
    const oldRoles = before.roles.cache;
    const newRoles = after.roles.cache;
    if(oldRoles.difference(newRoles).size != 0) {
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        let embeds = [];
        if(addedRoles.size > 0) {
            const count = addedRoles.size;

            let title, descriptor;
            if(count == 1) {
                title = 'Role Added';
                descriptor = 'a role';
            }
            else {
                title = `Roles Added [${count}]`;
                descriptor = `${count} roles`;
            }

            // get string of role mentions
            const mentions = Array.from(
                addedRoles.sorted((string, role) => role.position)
                .values())
                .map(role => `${role.toString()}`)
                .join(' ');
            
            embeds.push(getEmbedWithTarget(after.user)
                .setTitle(title)
                .setDescription(`${after.toString()} had ${descriptor} added`)
                .setColor(0x1f8b4c)
                .addField('Roles', mentions)
            );
        }

        if(removedRoles.size > 0) {
            const count = removedRoles.size;

            let title, descriptor;
            if(count == 1) {
                title = 'Role Removed';
                descriptor = 'a role';
            }
            else {
                title = `Roles Removed ${count}`;
                descriptor = `${count} roles`;
            }

            // get string of role mentions
            const mentions = Array.from(
                removedRoles.sorted((string, role) => role.position)
                .values())
                .map(role => `${role.toString()}`)
                .join(' ');

            embeds.push(getEmbedWithTarget(after.user)
                .setTitle(title)
                .setDescription(`${after.toString()} had ${descriptor} removed`)
                .setColor(0xed4245)
                .addField('Roles', mentions)
            );
        }

        await channel?.send({
            content: after.id,
            embeds: embeds
        });
    }
    
});

client.login(config.token);
