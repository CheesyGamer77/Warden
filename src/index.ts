import { Client, Formatters, Intents, MessageEmbed } from 'discord.js';
import config from '../config.json';
import LoggingModule, { LogEventType } from './modules/logging/LoggingModule';
import { getEmbedWithTarget } from './util/EmbedUtil';

const client = new Client({intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS
]});

client.once('ready', () => console.log('Ready'));

client.on('guildMemberAdd', async (member) => {
    const channel = await LoggingModule.fetchLogChannel(LogEventType.JOINS, member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Joined')
        .setDescription(user.toString() + ' joined the server')
        .setColor(0x1f8b4c)
        .addField('Account Created', Formatters.time(user.createdAt, 'R'))

    await channel?.send({ embeds: [ embed ] });
});

client.on('guildMemberRemove', async (member) => {
    const channel = await LoggingModule.fetchLogChannel(LogEventType.LEAVES, member.guild);

    const user = member.user;

    const embed = getEmbedWithTarget(user)
        .setTitle('Member Left')
        .setDescription(user.toString() + ' left the server')
        .setColor(0xed4245)
    
    // a removed member's joined at timestamp has the potential to be null
    // we don't bother to add the 'Member Since' field in that case
    if(member.joinedAt != null)
        embed.addField('Member Since', Formatters.time(member.joinedAt, 'R'));

    await channel?.send({ embeds: [ embed ] });
});

client.login(config.token);
