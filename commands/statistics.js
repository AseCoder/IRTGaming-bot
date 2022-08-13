const {SlashCommandBuilder} = require('discord.js');
const {version} = require('discord.js');
const si = require('systeminformation');
const os = require('node:os');
const messageCreate = require('../events/messageCreate');
module.exports = {
	run: async (client, interaction) => {
		const subCmd = interaction.options.getSubcommand();

		if (subCmd === 'commands') {
			const colunms = ['Command Name', 'Count'];
			const includedCommands = client.commands.filter(x => x.uses).sort((a, b) => b.uses - a.uses);
			if (includedCommands.size === 0) return interaction.reply(`No commands have been used yet.\nUptime: ${client.formatTime(client.uptime, 2, { commas: true, longNames: true })}`); 
			const nameLength = Math.max(...includedCommands.map(x => x.data.name.length), colunms[0].length) + 2;
			const amountLength = Math.max(...includedCommands.map(x => x.uses.toString().length), colunms[1].length) + 1;
			const rows = [`${colunms[0] + ' '.repeat(nameLength - colunms[0].length)}|${' '.repeat(amountLength - colunms[1].length) + colunms[1]}\n`, '-'.repeat(nameLength) + '-'.repeat(amountLength) + '\n'];
			includedCommands.forEach(command => {
				const name = command.data.name;
				const count = command.uses.toString();
				rows.push(`${name + '.'.repeat(nameLength - name.length)}${'.'.repeat(amountLength - count.length) + count}\n`);
			});
			const embed = new client.embed()
				.setTitle('Statistics: Command Usage')
				.setDescription(`List of commands that have been used in this session, ordered by amount of uses. Table contains command name and amount of uses.\nTotal amount of commands used in this session: ${client.commands.filter(x => x.uses).map(x => x.uses).reduce((a, b) => a + b, 0)}`)
				.setColor(client.config.embedColor)
				.setFooter({text: `Uptime: ${client.formatTime(client.uptime, 2, { commas: true, longNames: true })} - Discord.js V${version}`})
			if (rows.join('').length > 1024) {
				let fieldValue = '';
				rows.forEach(row => {
					if (fieldValue.length + row.length > 1024) {
						embed.addFields({name: '\u200b', value: `\`\`\`\n${fieldValue}\`\`\``});
						fieldValue = row;
					} else {
						fieldValue += row
					}
				});
				embed.addFields({name: '\u200b', value: `\`\`\`\n${fieldValue}\`\`\``});
			} else {
				embed.addFields({name: '\u200b', value: `\`\`\`\n${rows.join('')}\`\`\``});
			}
			interaction.reply({embeds: [embed]});
		} else if (subCmd === 'host') {
			const msg = await interaction.reply({content: 'Loading <a:IRT_loading:660661301353381898>', fetchReply: true})
			const cpu = await si.cpu();
			const ram = await si.mem();
			const gpu = await si.graphics();
			const embed = new client.embed()
				.setTitle('Statistics: Host info')
				.addFields(
					{name: 'Node.js', value: `RAM: ${(Math.round (process.memoryUsage().heapTotal / 1000)) / 1000}MB**/**${(Math.round(ram.available / 1000000)) / 1000}GB\nVersion: ${process.version}\nDiscord.js version: v${version}\nUptime: ${client.formatTime(client.uptime, 2, { commas: true, longNames: true })}`},
					{name: 'System', value: `CPU: ${cpu.manufacturer} ${cpu.brand}\nRAM: ${Math.floor(ram.total / 1024 / 1000000)}GB\nGPU: ${gpu.controllers[0].model}\nUptime: ${client.formatTime((os.uptime*1000), 2, { commas: true, longNames: true })}`}
				)
				.setColor(client.config.embedColor)
				.setFooter({text: `Load time: ${Date.now() - msg.createdTimestamp}ms`})
			msg.edit({content: null, embeds: [embed]})
		}
	},
	data: new SlashCommandBuilder()
		.setName("statistics")
		.setDescription("See command stats or host stats")
		.addSubcommand((optt)=>optt
        	.setName("commands")
        	.setDescription("Command stats")
    	)
		.addSubcommand((optt)=>optt
        	.setName("host")
        	.setDescription("Host stats")
    	)
};