import Discord, { SlashCommandBuilder } from 'discord.js';
import YClient from '../client';
export default {
	async run(client: YClient, interaction: Discord.ChatInputCommandInteraction<"cached">) {
		// remove from cooldown
		const subCmd = interaction.options.getSubcommand();
		// leaderboards
		if (subCmd === 'leaderboard') {
			const embed = new client.embed()
				.setTitle('__Tic Tac Toe Statistics__')
				.setDescription(`A total of ${client.tictactoe.getTotalGames()} games have been played.`)
				.setFooter({text: `Do "/tictactoe stats [username]" for player stats.`})
				.setColor(client.config.embedColor)
			await interaction.reply({content: `Recent Games\n\`\`\`\n${client.createTable(['Home', 'Guest', 'Time Ago'], client.tictactoe.getRecentGames(6).map((x) => [...x.players, client.formatTime(Date.now() - x.startTime)]), { columnAlign: ['left', 'right', 'middle'], columnSeparator: ['-', '|'] }, client)}\n\`\`\`\nBest Players (>10 games played)\n\`\`\`\n${client.createTable(['Player', 'Win Percentage'], client.tictactoe.getBestPlayers(6).map(x => [x[0], client.tictactoe.calcWinPercentage(x[1])]), { columnAlign: ['left', 'middle'], columnSeparator: [''] }, client)}\n\`\`\`\nMost Active Players\n\`\`\`\n${client.createTable(['Player', 'Total Games'], client.tictactoe.getMostActivePlayers(6).map(x => [x[0], x[1].total.toString()]), { columnAlign: ['left', 'middle'], columnSeparator: [''] }, client)}\n\`\`\``, embeds: [embed]});
			return;
		} else if (subCmd === 'stats') {
			const allPlayers = client.tictactoe.getAllPlayers();
			let playerStats;
			let username;
			const member = interaction.options.getMember("member") as Discord.GuildMember;
			if (member) {
				playerStats = allPlayers[member.user.tag];
				username = member.user.tag;
			} else {
				playerStats = allPlayers[interaction.user.tag];
				username = interaction.user.tag;
			}
			if (!playerStats) return interaction.reply({content: 'User not found.', ephemeral: true});
			const embed = new client.embed()
				.setTitle(`__Tic Tac Toe Statistics: ${username}__`)
				.setDescription(`This user has played a total of ${playerStats.total} games.\n${playerStats.wins} of those were wins.\n${playerStats.losses} of those were losses.\n${playerStats.draws} of those were draws.\nThis user has a win percentage of \`${client.tictactoe.calcWinPercentage(playerStats)}\``)
				.setColor(client.config.embedColor)
			return interaction.reply({embeds: [embed]});
		} else if(subCmd === "start"){
		if (client.games.has((interaction.channel as Discord.TextChannel).id)) {
			return interaction.reply({content: `There is already an ongoing game in this channel created by ${client.games.get((interaction.channel as Discord.TextChannel).id)}`, ephemeral: true});
		}
		// request opponent
		let request = `Who wants to play Tic Tac Toe with ${interaction.member.toString()}? First person to respond with "me" will be elected Opponent. (60s)`;
		let challenge = false;
		// if they challenged someone
		if (interaction.options.getUser("member")) {
			request = `Does ${(interaction.options.getUser("member") as Discord.User).toString()} want to play Tic Tac Toe with ${interaction.member.toString()}? Respond with y/n to decide if you want to be elected Opponent. (60s)`;
			challenge = true;
		}
		interaction.reply({content: request}).then(() => {
			client.games.set((interaction.channel as Discord.TextChannel).id, interaction.user.tag);
			// wait until someone wants to be the opponent
			const filter = (x: any) => {
				if (challenge) {
					return ['y', 'n'].some(y => x.content.toLowerCase().startsWith(y)) && x.author.id === (interaction.options.getUser("member") as Discord.User).id;
				} else {
					return x.content.toLowerCase().startsWith('me');
				}
			}
			(interaction.channel as Discord.TextChannel).awaitMessages({ filter, max: 1, time: 60000, errors: ['time']}).then(async b => {
				if (challenge) {
					if (b.first()?.content.toLowerCase().startsWith('n')) throw undefined;
				}
				// opponent is the first value of the collection returned by the collector (guildMember)
				const opponent = b.first()?.member;
				// if for some reason there is no opponent, end the game
				if (!opponent) return (interaction.channel as Discord.TextChannel).send('Something went wrong! You have no opponent.');
				// game object contains all data about the game
				const game = {
					id: Math.round(Math.random() * 100000).toString(16),
					board: [ /* X */
						[null, null, null], /* Y */
						[null, null, null],
						[null, null, null]
					]  as Array<Array<null | string>>,
					ended: false,
					turn: 0,
					nextTurn: 1,
					participants: [interaction.member, opponent],
					errors: [0, 0],
					markers: ['X', 'O'],
					startTime: Date.now(),
					get singleplayer() {
						return this.participants[0].user.id === this.participants[1].user.id;
					},
					userError: (index: number) => {
						game.errors[game.turn]++;
						const fouls = [
							'You failed to respond with coordinates.',
							'You failed to respond with coordinates in time.',
							'Illegal move. Outside board bounds.',
							'Illegal move. Position taken.'
						];
						const fatal = game.errors[game.turn] >= 3;
						const consequence = fatal ? 'You lose...' : 'Opponent\'s turn...';
						(interaction.channel as Discord.TextChannel).send(`${game.participants[game.turn].toString()} (\`${game.markers[game.turn]}\`) ${fouls[index]} ${consequence}`);
						const returnText = fatal ? 'surrender' : 'illegal';
						game.changeTurn();
						if (fatal) {
							game.victoryAction();
						}
						return returnText;
					},
					changeTurn: () => {
						const temp = game.nextTurn;
						game.nextTurn = game.turn;
						game.turn = temp;
						return;
					},
					victoryAction: () => {
						game.ended = true;
						(interaction.channel as Discord.TextChannel).send(`${game.boardState()}\n${game.participants[game.turn].toString()} (\`${game.markers[game.turn]}\`) Won the game!${game.singleplayer ? ' Singleplayer games are not counted in Tic Tac Toe Statistics.' : ' TIP: You can view Tic Tac Toe statistics with /tictactoe leaderboard`'}`);
						if (game.singleplayer) return;
						client.tictactoe.addData({ players: game.participants.map((x) => x.user.tag), winner: game.participants[game.turn].user.tag, startTime: game.startTime, endTime: Date.now() });
						return;
					},
					draw: () => {
						game.ended = true;
						(interaction.channel as Discord.TextChannel).send(`${game.boardState()}\nIt's a draw! Neither player won the game. TIP: You can view Tic Tac Toe statistics with /tictactoe leaderboard`);
						if (game.singleplayer) return;
						client.tictactoe.addData({ players: game.participants.map((x) => x.user.tag), draw: true, startTime: game.startTime, endTime: Date.now() });
						return;
					},
					boardState: () => {
						const markers: Array<string> = [];
						game.board.forEach((column, x) => {
							game.board[x].forEach((marker, y) => {
								markers.push(marker ? marker : ' ');
							});
						});
						let boardText = [
							` ${markers[2]} ┃ ${markers[5]} ┃ ${markers[8]}`,
							'━━━╋━━━╋━━━',
							` ${markers[1]} ┃ ${markers[4]} ┃ ${markers[7]}`,
							'━━━╋━━━╋━━━',
							` ${markers[0]} ┃ ${markers[3]} ┃ ${markers[6]}`
						];
						return 'Current board state:\n```\n' + boardText.join('\n') + '\n```';
					}
				};
				// send info about how to play the game
				await (interaction.channel as Discord.TextChannel).send(`The origin point of the board is in the bottom left (0,0). The top right is (2,2). Syntax for placing your marker is \`[X position],[Y position]\`. 3 fouls and you're out. You can type \`/end\` to surrender on your own turn or \`/draw\` to suggest a draw to your opponent.\n${game.participants[0].toString()} is \`${game.markers[0]}\`\n${game.participants[1].toString()} is \`${game.markers[1]}\`\n\`${game.markers[0]}\` starts!`);
				// cycle function is executed on every turn
				const cycle = () => { return new Promise<any | void>(async (res) => {
					// result is what .then() returns. ask the player where they want to place their marker
					const result: any = await (interaction.channel as Discord.TextChannel).send(game.boardState() + `\n${game.participants[game.turn].toString()}, Where do you want to place your \`${game.markers[game.turn]}\`? (60s)`).then(async c => {
						// returns what .then() returns. waits for the player to send coordinates. interaction must contain comma
						const filter2 = (d: any) => d.author.id === game.participants[game.turn].user.id && d.content.includes(',') && d.content.indexOf(',') <= 1;
						return await (interaction.channel as Discord.TextChannel).awaitMessages({ filter: filter2, max: 1, time: 60000, errors: ['time'] }).then(async (e: any) => {
							// ,end
							if (e.first()?.content.startsWith('end')) {
								await (interaction.channel as Discord.TextChannel).send(`${game.participants[game.turn].toString()} (\`${game.markers[game.turn]}\`) wants to surrender!`);
								game.changeTurn();
								game.victoryAction();
								return res('h');
							// ,draw
							} else if (e.first()?.content.startsWith('draw')) {
								await (interaction.channel as Discord.TextChannel).send(`${game.participants[game.nextTurn].toString()} (\`${game.markers[game.nextTurn]}\`), do you want to end the game in a draw? Respond with y/n. (60s)`);
								const filter = (x: any) => x.author.id === game.participants[game.nextTurn].user.id && ['y', 'n'].some(y => x.content.toLowerCase().startsWith(y));
								const opponentResponses: any = await (interaction.channel as Discord.TextChannel).awaitMessages({ filter, max: 1, time: 60000, errors: ['time']}).catch(() => (interaction.channel as Discord.TextChannel).send('Game does not end.'));
								
								if (opponentResponses.first()) {
									if (opponentResponses.first().content.toLowerCase().startsWith('y'))
									game.draw();
									res('h');
									return false;
								} else {
									res('h');
									return false;
								}
							}
							// coords is the first interaction of the collection, split into 2 at the comma and mapped into integers
							const coordinates: Array<number> = e.first().content.split(',').map((f: string) => parseInt(f));
							// if for some reason the interaction wasnt coordinates, foul
							if (coordinates.length !== 2 || coordinates.some(x => isNaN(x))) {
								res(game.userError(0));
								return false;
							}
							// return coords
							return coordinates;
						}).catch(err => {
							// player failed to send coordinates in time, foul
							res(game.userError(1));
							return false;
						});
					});
					if (!result) return;
					if (result[0] > 2 || result[0] < 0 || result[1] > 2 || result[1] < 0) return res(game.userError(2));
					const MarkerAtCoords = game.board[result[0]][result[1]];
					if (!MarkerAtCoords) {
						const playerMarker = game.markers[game.turn];
						game.board[result[0]][result[1]] = playerMarker;
						// if move won, victory to current turn
						// rows
						for (let i = 0; i < 3; i++) {
							if (
								game.board[0][i] === game.board[1][i]
								&& game.board[1][i] === game.board[2][i]
								&& game.board[0][i] === game.markers[game.turn]
							) {
								return res(game.victoryAction());
							}
						}
						// columns
						if (game.board.some(column => 
							column[0] === column[1]
							&& column[1] === column[2]
							&& column[0] === game.markers[game.turn]
						)) return res(game.victoryAction());
						// diagonally
						if (
							(
								game.board[0][0] === game.board[1][1]
								&& game.board[1][1] === game.board[2][2]
								&& game.board[0][0] === game.markers[game.turn]
							)
							|| (
								game.board[0][2] === game.board[1][1]
								&& game.board[1][1] === game.board[2][0]
								&& game.board[0][2] === game.markers[game.turn]
							)
						) return res(game.victoryAction());
						// draw, if none of the spots are null, aka there is a marker in every spot
						if (!game.board.some(x => x.includes(null))) {
							game.draw();
							return res('h');
						}
					} else return res(game.userError(3));
					return res(game.changeTurn());
				})};
				while (!game.ended) {
					await cycle();
				}
				setTimeout(() => {
					(interaction.channel as Discord.TextChannel).send('Game has ended.');
					client.games.delete((interaction.channel as Discord.TextChannel).id);

				}, 1000);
			}).catch(err => {
				// no one responded "me"
				(interaction.channel as Discord.TextChannel).send('Haha no one wants to play with you, lonely goblin.'),
				client.games.delete((interaction.channel as Discord.TextChannel).id);
			});
		});
	}
	},
	data: new SlashCommandBuilder()
		.setName("tictactoe")
		.setDescription("Play the famous Tic Tac Toe with a partner, or view the leaderboard.")
		.addSubcommand((optt)=>optt
			.setName("leaderboard")
			.setDescription("View the tic tac toe leaderboard."))
		.addSubcommand((optt)=>optt
			.setName("stats")
			.setDescription("View your or another users tic tac toe statistics.")
			.addUserOption((opt)=>opt
				.setName("member")
				.setDescription("The member's stats you woould like to view.")
				.setRequired(false)))
		.addSubcommand((optt)=>optt
			.setName("start")
			.setDescription("Start's a game of tic tac toe.")
			.addUserOption((opt)=>opt
				.setName("member")
				.setDescription("Challenge someone!")
				.setRequired(false)))

};
