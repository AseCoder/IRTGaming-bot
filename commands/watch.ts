import Discord, { SlashCommandBuilder } from 'discord.js';
import YClient from '../client';
export default {
	async run(client: YClient, interaction: Discord.ChatInputCommandInteraction<"cached">) {
        if (!client.isMPStaff(interaction.member)) return client.youNeedRole(interaction, "mpstaff");
        const subCmd = interaction.options.getSubcommand();
        const name = interaction.options.getString('username');
        const reason = interaction.options.getString('reason');
        const wlData = client.watchList._content.find((x: Array<string>) => x[0] == name);

        if (subCmd === 'add') {
            if (wlData) {
                interaction.reply(`\`${wlData[0]}\` already exists on watchList for reason \`${wlData[1]}\``);
            } else {
                client.watchList.addData([name, reason]).forceSave();
                interaction.reply({content: `Successfully added \`${name}\` with reason \`${reason}\``});
            }
        } else if (subCmd === 'remove') {
            if (wlData) {
                client.watchList.removeData(name, 1, 0).forceSave();
                interaction.reply(`Successfully removed \`${name}\` from watchList`);
            } else {
                interaction.reply(`\`${name}\` doesn't exist on watchList`);
            }
        }
    },
    data: new SlashCommandBuilder()
        .setName("watch")
        .setDescription("Manage watchList names")
        .addSubcommand((optt)=>optt
            .setName('add')
            .setDescription('add a player to watchList')
            .addStringOption((opt)=>opt
                .setName('username')
                .setDescription('The player name to add')
                .setRequired(true))
            .addStringOption((opt)=>opt
                .setName('reason')
                .setDescription('The reason for adding the player')
                .setRequired(true)))
        .addSubcommand((optt)=>optt
            .setName('remove')
            .setDescription('remove a player from watchList')
            .addStringOption((opt)=>opt
                .setName('username')
                .setDescription('The player name to remove')
                .setRequired(true)))
};
