import Discord from 'discord.js';
import YClient from '../client';

export default {
    name: "guildMemberAdd",
    execute: async (client: YClient, member: Discord.GuildMember) => {
        if (!client.config.botSwitches.logs || member.partial) return;
        
        // Add Member role upon joining if mainServer is the IRTGaming server
        if (client.config.mainServer.id == '552565546089054218') member.roles.add('552566408240693289');

        // Welcome message
        const index = member.guild.memberCount;
        const suffix = ((index) => {
            const numbers = index.toString().split('').reverse(); // eg. 1850 -> [0, 5, 8, 1]
            if (numbers[1] === '1') { // this is some -teen
                return 'th';
            } else {
                if (numbers[0] === '1') return 'st';
                else if (numbers[0] === '2') return 'nd';
                else if (numbers[0] === '3') return 'rd';
                else return 'th';
            }
        })(index);

        const embed0 = new client.embed()
            .setTitle(`Welcome, ${member.user.tag}!`)
            .setColor(client.config.embedColor)
            .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 2048}) || member.user.defaultAvatarURL)
            .setDescription(`Please familiarize yourself with our <#552590507352653827> and head over to <#922631314195243080> to gain access to more channels & receive notification about community news.`)
            .addFields({name: 'Useful channels', value: `<:IRTDot:908818924286648350> Our game servers: <#739100711073218611>\n<:IRTDot:908818924286648350> Report players: <#825046442300145744>\n<:IRTDot:908818924286648350> Come chat with us!: <#552565546093248512>`})
            .setFooter({text: `${index}${suffix} member`});
        (client.channels.resolve(client.config.mainServer.channels.welcome) as Discord.TextChannel).send({content: `<@${member.user.id}>`, embeds: [embed0]})

        // Normal join log
        const logChannel = client.channels.resolve(client.config.mainServer.channels.botlogs) as Discord.TextChannel;
        const oldInvites = client.invites;
        const newInvites = await member.guild.invites.fetch();
        const usedInvite = newInvites.find((inv: any) => oldInvites.get(inv.code)?.uses < inv.uses);

        newInvites.forEach((inv: any) => client.invites.set(inv.code, {uses: inv.uses, creator: inv.inviter.id}));
 
        const embed1 = new client.embed()
            .setTitle(`Member Joined: ${member.user.tag}`)
            .setDescription(`<@${member.user.id}>\n\`${member.user.id}\``)
            .addFields(
                {name: '🔹 Account Creation Date', value: `<t:${Math.round(member.user.createdTimestamp / 1000)}>\n<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`},
                {name: '🔹 Invite Data', value: usedInvite ? `Invite: \`${usedInvite.code}\`\nCreated by: **${usedInvite.inviter?.tag}**` : 'No Data found'})
            .setColor(client.config.embedColorGreen)
            .setTimestamp()
            .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 2048}));
        logChannel.send({embeds: [embed1]})
 
        
    }
}
