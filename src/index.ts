import { Client, Formatters, Intents, MessageEmbed } from 'discord.js';
import config from '../config.json';
import LoggingModule, { LogEventType } from './modules/logging/LoggingModule';

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

    const embed = new MessageEmbed()
        .setAuthor({ name: user.username, iconURL: user.avatarURL() ?? user.defaultAvatarURL })
        .setTitle('Member Joined')
        .setDescription(user.username + ' joined the server')
        .setColor(0x1f8b4c)
        .addField('Account Created', Formatters.time(user.createdAt, 'R'))
        .setFooter({ text: 'User ID: ' + user.id })
        .setTimestamp()

    await channel?.send({
        embeds: [ embed ]
    })
})

client.login(config.token);
