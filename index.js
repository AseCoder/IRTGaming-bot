const Discord = require("discord.js");
const YClient = require("./client");
const client = new YClient();
client.init();
const fs = require("fs");

console.log(client.config.botSwitches)

// global properties
client.on("ready", async () => {
	client.guilds.cache.forEach(async (e)=>{await e.members.fetch();});
	await client.channels.fetch(require("./config.json").mainServer.channels.modlogs).then((channel)=>{channel.send(`:warning: Bot restarted :warning:\n${client.config.eval.whitelist.map(x => `<@${x}>`).join(' ')}`)});
	setInterval(()=>{client.guilds.cache.get(client.config.mainServer.id).invites.fetch().then((invs)=>{invs.forEach(async(inv)=>{client.invites.set(inv.code, {uses: inv.uses, creator: inv.inviter.id})})})}, 500000)
	if(client.config.botSwitches.registerCommands) client.guilds.cache.get(client.config.mainServer.id).commands.set(client.registery).catch((e)=>{console.log(`Couldn't register commands bcuz: ${e}`)});
	process.on("unhandledRejection", async (error)=>{
		console.log(error)
		await client.channels.fetch(require("./config.json").mainServer.channels.modlogs).then((channel)=>{
        channel.send({content: `${client.config.eval.whitelist.map(x=>`<@${x}>`).join(", ")}`, embeds: [new Discord.MessageEmbed().setTitle("Error Caught!").setColor("#420420").setDescription(`**Error:** \`${error.message}\`\n\n**Stack:** \`${`${error.stack}`.slice(0, 2500)}\``)]})
		})
	});
	setInterval(async () => {
		await client.user.setPresence({ activities: [{ name: 'paint dry', type: 'WATCHING'}], status: 'dnd' });
	}, 60000);
	console.log("\x1b[36m", `Bot active as ${client.user.tag}.`);

	setInterval(async () => {
		client.FSstatsLoop(client, client.tokens.ps, '739308099709567024', '778848112588095559', '978784250532859934')
		client.FSstatsLoop(client, client.tokens.pg, '739308099709567024', '778848112588095559', '977786524986900510')
		client.FSstatsLoop(client, client.tokens.rf, '739308099709567024', '778848112588095559', '977786595807748136')
	}, 15000);

	const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    eventFiles.forEach((file)=>{
    const event = require(`./events/${file}`);
	client.on(event.name, async (...args) => event.execute(client, ...args));
  }); 
});

// userLevels
Object.assign(client.userLevels, {
	_requirements: client.config.mainServer.roles.levels,
	_milestone() {
		const milestones = [10, 100, 1000, 50000, 69696, 100000, 200000, 300000, 400000, 420000, 500000]; // always keep the previously achived milestone in the array so the progress is correct. here you can stack as many future milestones as youd like
		const total = Object.values(this._content || {}).reduce((a, b) => a + b, 0);
		const next = milestones.find(x => x >= total) || undefined;
		const previous = milestones[milestones.indexOf(next) - 1] || 0;
		return {
			total,
			next,
			previous,
			progress: (total - previous) / (next - previous)
		}
	},
	incrementUser(userid) {
		const amount = this._content[userid];
		if (amount) this._content[userid]++;
		else this._content[userid] = 1;
		// milestone
		const milestone = this._milestone();
		if (milestone && milestone.total === this._milestone().next) {
			const channel = client.channels.resolve("858073309920755773"); // #announcements
			if (!channel) return console.log("tried to send milestone announcement but channel wasnt found");
			channel.send(`:tada: Milestone reached! **${milestone.next.toLocaleString("en-US")}** messages have been sent in this server and recorded by Level Roles. :tada:`);
		}
		return this;
	},
	getUser(userid) {
		return this._content[userid] || 0;
	},
	hasUser(userid) {
		return !!this._content[userid];
	},
	getEligible(guildMember) {
		const age = (Date.now() - guildMember.joinedTimestamp) / 1000 / 60 / 60 / 24;
		const messages = this.getUser(guildMember.user.id);
		const roles = Object.entries(this._requirements).map((x, key) => {
			return {
				role: {
					level: key,
					id: x[1].id,
					has: guildMember.roles.cache.has(x[1].id)
				},
				requirements: {
					age: x[1].age,
					messages: x[1].messages
				},
				eligible: (age >= x[1].age) && (messages >= x[1].messages),
			}
		});
		return { age, messages, roles };
	},
});

// punishments
Object.assign(client.punishments, {
	createId() {
		return Math.max(...client.punishments._content.map(x => x.id), 0) + 1;
	},
	async addPunishment(type = "", member, options = {}, moderator) {
		const now = Date.now();
		const { time, reason, interaction } = options;
		const ms = require("ms");
		let timeInMillis;
		if(type !== "mute"){
			timeInMillis = time ? ms(time) : null;
		} else {
			timeInMillis = time ? ms(time) : 2419200000;
		}
		switch (type) {
			case "ban":
				const banData = { type, id: this.createId(), member: member.user.id, moderator, time: now };
				const dm1 = await member.send(`You've been banned from ${member.guild.name} ${timeInMillis ? `for ${client.formatTime(timeInMillis, 4, { longNames: true, commas: true })} (${timeInMillis}ms)` : "forever"} for reason \`${reason || "unspecified"}\` (Case #${banData.id})`).catch(err => setTimeout(() => interaction.channel.send('Failed to DM user.'), 500));
				const banResult = await member.ban({ reason: `${reason || "unspecified"} | Case #${banData.id}` }).catch(err => err.message);
				if (typeof banResult === "string") {
					dm1.delete();
					return `Ban was unsuccessful: ${banResult}`;
				} else {
					if (timeInMillis) {
						banData.endTime = now + timeInMillis;
						banData.duration = timeInMillis;
					}
					if (reason) banData.reason = reason;
					client.makeModlogEntry(banData, client);
					this.addData(banData);
					this.forceSave();
					return new client.embed()
						.setTitle(`Case #${banData.id}: Ban`)
						.setDescription(`${member.user.tag}\n<@${member.user.id}>\n(\`${member.user.id}\`)`)
						.addFields(
							{name: 'Reason', value: `\`${reason || "unspecified"}\``},
							{name: 'Duration',
								value: `${timeInMillis ? `for ${client.formatTime(timeInMillis, 4, {
									longNames: true,
									commas: true
								})} (${timeInMillis}ms)` : "forever"}`
							})
						.setColor(client.config.embedColor)
				}
			case "softban":
				const guild = member.guild;
				const softbanData = { type, id: this.createId(), member: member.user.id, moderator, time: now };
				const dm2 = await member.send(`You've been softbanned from ${member.guild.name} for reason \`${reason || "unspecified"}\` (Case #${softbanData.id})`).catch(err => setTimeout(() => interaction.channel.send(`Failed to DM <@${member.user.id}>.`), 500));
				const softbanResult = await member.ban({ days: 7, reason: `${reason || "unspecified"} | Case #${softbanData.id}` }).catch(err => err.message);
				if (typeof softbanResult === "string") {
					dm2.delete();
					return `Softan was unsuccessful: ${softbanResult}`;
				} else {
					const unbanResult = guild.members.unban(softbanData.member, `${reason || "unspecified"} | Case #${softbanData.id}`).catch(err => err.message);
					if (typeof unbanResult === "string") {
						return `Softbanan (unban) was unsuccessful: ${softbanResult}`
					} else {
						if (reason) softbanData.reason = reason;
						client.makeModlogEntry(softbanData, client);
						this.addData(softbanData);
						this.forceSave();
						return new client.embed()
							.setTitle(`Case #${softbanData.id}: Softban`)
							.setDescription(`${member.user.tag}\n<@${member.user.id}>\n(\`${member.user.id}\`)`)
							.addFields({name: 'Reason', value: `\`${reason || "unspecified"}\``})
							.setColor(client.config.embedColor)
					}
				}
			case "kick":
				const kickData = { type, id: this.createId(), member: member.user.id, moderator, time: now };
				const dm3 = await member.send(`You've been kicked from ${member.guild.name} for reason \`${reason || "unspecified"}\` (Case #${kickData.id})`).catch(err => setTimeout(() => interaction.channel.send(`Failed to DM <@${member.user.id}>.`), 500));
				const kickResult = await member.kick(`${reason || "unspecified"} | Case #${kickData.id}`).catch(err => err.message);
				if (typeof kickResult === "string") {
					dm3.delete();
					return `Kick was unsuccessful: ${kickResult}`;
				} else {
					if (reason) kickData.reason = reason;
					client.makeModlogEntry(kickData, client);
					this.addData(kickData);
					this.forceSave();
					return new client.embed()
						.setTitle(`Case #${kickData.id}: Kick`)
						.setDescription(`${member.user.tag}\n<@${member.user.id}>\n(\`${member.user.id}\`)`)
						.addFields({name: 'Reason', value: `\`${reason || "unspecified"}\``})
						.setColor(client.config.embedColor)
				}
			case "mute":
				const muteData = { type, id: this.createId(), member: member.user.id, moderator, time: now };
				let muteResult;
				if(client.hasModPerms(client, member)) return "Staff members cannot be muted."
				const dm4 = await member.send(`You've been muted in ${member.guild.name} ${timeInMillis ? `for ${client.formatTime(timeInMillis, 4, { longNames: true, commas: true })} (${timeInMillis}ms)` : "forever"} for reason \`${reason || "unspecified"}\` (Case #${muteData.id})`).catch(err => setTimeout(() => interaction.channel.send('Failed to DM user.'), 500));
				if(timeInMillis){
				muteResult = await member.timeout(timeInMillis, `${reason || "unspecified"} | Case #${muteData.id}`).catch(err => err.message);
				} else {
				muteResult = await member.timeout(2419200000, `${reason || "unspecified"} | Case #${muteData.id}`).catch(err => err.message);
				}
				if (typeof muteResult === "string") {
					dm4.delete();
					return `Mute was unsuccessful: ${muteResult}`;
				} else {
					if (timeInMillis) {
						muteData.endTime = now + timeInMillis;
						muteData.duration = timeInMillis;
					}
					if (reason) muteData.reason = reason;
					client.makeModlogEntry(muteData, client);
					this.addData(muteData);
					this.forceSave();
					return new client.embed()
						.setTitle(`Case #${muteData.id}: Mute`)
						.setDescription(`${member.user.tag}\n<@${member.user.id}>\n(\`${member.user.id}\`)`)
						.addFields(
							{name: 'Reason', value: `\`${reason || "unspecified"}\``},
							{name: 'Duration',
								value: `${client.formatTime(timeInMillis, 4, {
									longNames: true,
									commas: true
								})} (${timeInMillis}ms)`
							})
						.setColor(client.config.embedColor)
						.setThumbnail('https://cdn.discordapp.com/attachments/858068843570003998/942295666137370715/muted.png')
				}
			case "warn":
				const warnData = { type, id: this.createId(), member: member.user.id, moderator, time: now };
				const warnResult = await member.send(`You've been warned in ${member.guild.name} for reason \`${reason || "unspecified"}\` (Case #${warnData.id})`).catch(err => setTimeout(() => interaction.channel.send(`Failed to DM <@${member.user.id}>.`), 500));
				if (typeof warnResult === "string") {
					return `Warn was unsuccessful: ${warnResult}`;
				} else {
					if (reason) warnData.reason = reason;
					client.makeModlogEntry(warnData, client);
					this.addData(warnData);
					this.forceSave();
					const embedw = new client.embed()
					.setTitle(`Case #${warnData.id}: Warn`)
					.setDescription(`${member.user.tag}\n<@${member.user.id}>\n(\`${member.user.id}\`)`)
					.addFields({name: 'Reason', value: `\`${reason || "unspecified"}\``})
					.setColor(client.config.embedColor)
					.setThumbnail('https://media.discordapp.net/attachments/858068843570003998/935651851494363136/c472i6ozwl561_remastered.jpg')
					if (moderator !== '795443537356521502') {return embedw};
				}
		}
	},
	async removePunishment(caseId, moderator, reason) {
		const now = Date.now();
		const punishment = this._content.find(x => x.id === caseId);
		const id = this.createId();
		if (!punishment) return "Punishment not found.";
		if (["ban", "mute"].includes(punishment.type)) {
			const guild = client.guilds.cache.get(client.config.mainServer.id);
			let removePunishmentResult;
			if (punishment.type === "ban") {
				// unban
				removePunishmentResult = await guild.members.unban(punishment.member, `${reason || "unspecified"} | Case #${id}`).catch(err => err.message); // unbanning returns a user
			} else if (punishment.type === "mute") {
				// remove role
				const member = await guild.members.fetch(punishment.member).catch(err => false);
				if (member) {
					removePunishmentResult = await member
					
					if (typeof removePunishmentResult !== "string") {
						member.timeout(null, `${reason || "unspecified"} | Case #${id}`)
						removePunishmentResult.send(`You've been unmuted in ${removePunishmentResult.guild.name}.`);
						removePunishmentResult = removePunishmentResult.user; // removing a role returns a guildmember
					}
				} else {
					// user has probably left. quietly remove punishment from json
					const removePunishmentData = { type: `un${punishment.type}`, id, cancels: punishment.id, member: punishment.member, reason, moderator, time: now };
					this._content[this._content.findIndex(x => x.id === punishment.id)].expired = true;
					this.addData(removePunishmentData).forceSave();
				}
			}
			if (typeof removePunishmentResult === "string") return `Un${punishment.type} was unsuccessful: ${removePunishmentResult}`;
			else {
				const removePunishmentData = { type: `un${punishment.type}`, id, cancels: punishment.id, member: punishment.member, reason, moderator, time: now };
				client.makeModlogEntry(removePunishmentData, client);
				this._content[this._content.findIndex(x => x.id === punishment.id)].expired = true;
				this.addData(removePunishmentData).forceSave();
				return `Successfully ${punishment.type === "ban" ? "unbanned" : "unmuted"} ${removePunishmentResult?.tag} (${removePunishmentResult?.id}) for reason \`${reason || "unspecified"}\``;
			}
		} else {
			try {
				const removePunishmentData = { type: "removeOtherPunishment", id, cancels: punishment.id, member: punishment.member, reason, moderator, time: now };
				client.makeModlogEntry(removePunishmentData, client);
				this._content[this._content.findIndex(x => x.id === punishment.id)].expired = true;
				this.addData(removePunishmentData).forceSave();
				return `Successfully removed Case #${punishment.id} (type: ${punishment.type}, user: ${punishment.member}).`;
			} catch (error) {
				return `${punishment.type[0].toUpperCase() + punishment.type.slice(1)} removal was unsuccessful: ${error.message}`;
			}
		}
	}
});

// event loop, for punishments and daily msgs
setInterval(() => {
	const now = Date.now();
	const lrsStart = 1638138120311;
	client.punishments._content.filter(x => x.endTime <= now && !x.expired).forEach(async punishment => {
		console.log(`${punishment.member}"s ${punishment.type} should expire now`);
		const unpunishResult = await client.punishments.removePunishment(punishment.id, client.user.id, "Time\'s up!");
		console.log(unpunishResult);
	});
	const formattedDate = Math.floor((now - lrsStart) / 1000 / 60 / 60 / 24);
	const dailyMsgs = require("./databases/dailyMsgs.json");
	if (!dailyMsgs.some(x => x[0] === formattedDate)) {
		let total = Object.values(client.userLevels._content).reduce((a, b) => a + b, 0); // sum of all users
		const yesterday = dailyMsgs.find(x => x[0] === formattedDate - 1);
		if (total < yesterday) { // messages went down
			total = yesterday;
		}
		dailyMsgs.push([formattedDate, total]);
		fs.writeFileSync(__dirname + "/databases/dailyMsgs.json", JSON.stringify(dailyMsgs));
	}
}, 5000);
