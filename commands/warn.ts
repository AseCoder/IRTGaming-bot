import Discord, { SlashCommandBuilder } from 'discord.js';
import YClient from '../client';
export default {
	async run(client: YClient, interaction: Discord.ChatInputCommandInteraction<"cached">) {
		client.punish(client, interaction, 'warn');
	},
	data: new SlashCommandBuilder()
		.setName("warn")
		.setDescription("Warn a member")
		.addUserOption((opt)=>opt
			.setName("member")
			.setDescription("The member to warn")
			.setRequired(true))
		.addStringOption((opt)=>opt
			.setName("reason")
			.setDescription("The reason for warning the member")
			.setRequired(false))
};
