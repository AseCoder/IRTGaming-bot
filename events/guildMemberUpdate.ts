import Discord from 'discord.js';
import YClient from '../client';

export default {
    name: "guildMemberUpdate",
    execute: async (client: YClient, oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        if (!client.config.botSwitches.logs) return;

        const logChannel = client.channels.resolve(client.config.mainServer.channels.botlogs) as Discord.TextChannel;

        // Nickname changes
        if (oldMember.nickname != newMember.nickname) {
            const embed = new client.embed().setColor(client.config.embedColor).setTitle(`Member Update: ${newMember.user.tag}`).setDescription(`<@${newMember.user.id}>\n\`${newMember.user.id}\``).setThumbnail(newMember.user.displayAvatarURL({ extension: 'png', size: 2048}))
                .addFields(
                    {name: '🔹 Old Nickname', value: oldMember.nickname == null ? '*No nickname*' : `\`\`\`${oldMember.nickname}\`\`\``},
                    {name: '🔹 New Nickname', value: newMember.nickname == null ? '*No nickname*' : `\`\`\`${newMember.nickname}\`\`\``}
                )
                .setTimestamp()

            logChannel.send({embeds: [embed]})
        }

        // Role changes
        const newRoles = newMember.roles.cache.map((x, i) => i).filter(x => !oldMember.roles.cache.map((x, i) => i).some(y => y == x));
        const oldRoles = oldMember.roles.cache.map((x, i) => i).filter(x => !newMember.roles.cache.map((x, i) => i).some(y => y == x));
        
        if ((newRoles.length != 0 || oldRoles.length != 0) && ((Date.now() - (newMember.joinedTimestamp as number)) > 5000)) {
            const embed = new client.embed().setColor(client.config.embedColor).setTitle(`Member Update: ${newMember.user.tag}`).setDescription(`<@${newMember.user.id}>\n\`${newMember.user.id}\``).setThumbnail(newMember.user.displayAvatarURL({ extension: 'png', size: 2048})).setTimestamp()

            if (newRoles.length != 0) {
                embed.addFields({name: '🔹 Roles Added', value: newRoles.map((x) => `<@&${x}>`).join(' ')});
            }
            if (oldRoles.length != 0) {
                embed.addFields({name: '🔹 Roles Removed', value: oldRoles.map((x) => `<@&${x}>`).join(' ')});
            }
            logChannel.send({embeds: [embed]});
        }

        // Trusted Farmer auto-updating list
        const mp_tf = (await (client.guilds.cache.get(client.config.mainServer.id) as Discord.Guild).roles.fetch(client.config.mainServer.roles.trustedfarmer) as Discord.Role).members;
        (client.channels.resolve('718555644801712200') as Discord.TextChannel)?.messages?.fetch('980240957167521863').then((msg)=>{msg.edit({content: `<@&${client.config.mainServer.roles.trustedfarmer}>: ${mp_tf.size}\n${mp_tf.map((e: Discord.GuildMember)=>`<@${e.user.id}>`).join("\n") || " "}`})})
    }
}
