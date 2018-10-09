const config = require('./config.json');
const CatLoggr = require('cat-loggr');
const loggr = new CatLoggr().setGlobal();
const Eris = require('eris');
const fs = require('fs'), path = require('path');
const moment = require('moment');
const { Game, Player, Card } = require('./Structures');

let conf = {
    getAllUsers: true, maxShards: config.maxShards || 6
};
if (config.shard) {
    conf.firstShardID = config.shard;
    conf.lastShardID = config.shard;
}

const client = new Eris(config.token, conf);
const prefix = config.prefix;

const games = {};
let ready = false;

process.on('exit', code => {
    console.info('Exiting! Serializing current games...');
    let inProgress = {};
    for (const id in games) {
        inProgress[id] = games[id].serialize();
    }
    console.info('Serialized', Object.keys(inProgress).length, 'games! Saving...');
    fs.writeFileSync(path.join(__dirname, 'current-games.json'), JSON.stringify(inProgress, null, 2), { encoding: 'utf8' });
});

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.error(error);
});

let globalGame;

client.on('ready', () => {
    console.log('ready!');

    console.info('Attemting to load in-progress games...');
    try {
        const currentGames = require('./current-games.json');
        for (const id in currentGames) {
            games[id] = Game.deserialize(currentGames[id], client);
        }
        console.info('Restored', Object.keys(currentGames).length, 'games.');
    } catch (err) {
        console.error('Issue restoring old games:', err);
    }
    ready = true;

    globalGame = new Game(client, {});
});

client.on('error', err => {
    console.error(err);
});

client.on('warn', msg => {
    console.error(msg);
});

// client.on('debug', msg => {
//     console.log(msg);
// });

client.on('connect', id => {
    console.log('Shard', id, 'has connected');
});

client.on('shardPreReady', id => {
    console.log('Shard', id, 'is pre-ready');
});
client.on('shardReady', id => {
    console.log('Shard', id, 'is ready');
});
client.on('shardResume', id => {
    console.log('Shard', id, 'resumed');
});
client.on('shardDisconnect', (err, id) => {
    console.warn('Shard', id, 'disconnected', err || '');
});

client.on('messageCreate', async (msg) => {
    if (!ready) return;
    if (msg.content.toLowerCase().startsWith(prefix)) {
        let segments = msg.content.substring(prefix.length).trim().split('&&');
        if (segments.length > 2) return await msg.channel.createMessage('Sorry, you can only execute up to **two** commands with a single message!');
        if (segments[1] && segments[1].trim().toLowerCase().startsWith(prefix))
            segments[1] = segments[1].trim().substring(prefix.length);
        for (const text of segments) {
            let words = text.trim().split(/\s+/);
            let name = words.shift().toLowerCase();
            if (commands.hasOwnProperty(name)) {
                let res = await commands[name](msg, words, text.trim().substring(name.length));
                if (res)
                    await msg.channel.createMessage(res);
            }
        }
    }
});

const timeoutTimer = setInterval(async () => {
    for (const id in games) {
        let game = games[id];
        if (!game.started && (Date.now() - game.lastChange) >= 3 * 60 * 1000) {
            await game.send(`The game has been cancelled due to inactivity.`);
            delete games[id];
        } else if (game.started && (Date.now() - game.lastChange) >= 5 * 60 * 1000) {
            let user = game.queue[0].member.user;
            let msg = { author: user, channel: { id } };
            let out = await commands.quit(msg, []);
            if (typeof out === 'string') {
                out = out.split('\n');
                out[0] = `**${user.username}#${user.discriminator}** has been kicked from the game due to inactivity.`;
                out = out.join('\n');
            } else {
                let desc = out.embed.description;
                desc = desc.split('\n');
                desc[0] = `**${user.username}#${user.discriminator}** has been kicked from the game due to inactivity.`;
                desc = desc.join('\n');
                out.embed.description = desc;
            }
            if (game.queue.length === 0) {
                out.embed.description += `\nThe game has been cancelled due to no remaining players.`;
                delete games[id];
            }
            await game.send(out);
        }
    }
}, 1000 * 30);

const commands = {
    async help(msg, words) {
        let out = `:sparkles: **__UNO Commands__** :sparkles:\n
**${prefix.toUpperCase()} HELP** - Shows this message!
**${prefix.toUpperCase()} JOIN** - Joins (or creates) a game in the current channel!
**${prefix.toUpperCase()} QUIT** - Quits the game! Party pooper.
**${prefix.toUpperCase()} START** - Starts the game! Can only be used by the player who joined first.
**${prefix.toUpperCase()} TABLE** - Shows everyone at the table.
**${prefix.toUpperCase()} PLAY <colour> <value>** - Plays a card! Colours and values are interchangeable.
**${prefix.toUpperCase()} PICKUP** - Picks up a card!
**${prefix.toUpperCase()} CALLOUT** - Calls a player out for only having one card left!
**${prefix.toUpperCase()}!** - Let everyone know that you only have one card left!

You can execute up to two commands in a single message by separating them with \`&&\`!`;

        return out;
    },
    async join(msg, words) {
        let game = games[msg.channel.id];
        if (!game) {
            game = games[msg.channel.id] = new Game(client, msg.channel);
            game.generateDeck();
        }
        if (game.started) {
            return 'Sorry, this game has already started!';
        }
        let res = game.addPlayer(msg.member);
        if (res === null)
            return "You've already registered for this game!";
        else {
            if (game.queue.length === 1) {
                return 'A game has been registered with you as the leader! Once all players have joined, type `uno start` to begin the game!'
                    + '\n\nThe rules for this game are:\n' + game.serializeRules()
                    + '\nYou can configure these or get a description with the `rules` command (uno rules <key> [value])';
            } else {
                return 'You have joined the game! Please wait for it to start.';
            }
        }
    },
    async quit(msg, words) {
        let game = games[msg.channel.id];
        if (game && game.players.hasOwnProperty(msg.author.id)) {

            let out = 'You are no longer participating in the game.\n\n';

            if (game.started && game.queue.length <= 2) {
                game.queue = game.queue.filter(p => p.id !== msg.author.id);
                game.finished.push(game.queue[0]);
                out += 'The game is now over. Thanks for playing! Here is the scoreboard:\n';
                for (let i = 0; i < game.finished.length; i++) {
                    out += `${i + 1}. **${game.finished[i].member.user.username}**\n`;
                }
                delete games[game.channel.id];
                return out;
            }
            if (game.started && game.player.member.id === msg.author.id) {
                game.next();
                out = {
                    embed: {
                        description: `${out}A **${game.flipped}** was played last. \n\nIt is now ${game.player.member.user.username}'s turn!`,
                        thumbnail: { url: game.flipped.URL },
                        color: game.flipped.colorCode
                    }
                };
            }
            delete game.players[msg.author.id];
            game.queue = game.queue.filter(p => p.id !== msg.author.id);
            return out;
        } else return 'You haven\'t joined!';
    },
    async rules(msg, words) {

        let game = games[msg.channel.id];
        if (game) {
            if (words.length === 0) {
                return game.serializeRules();
            } else if (words.length === 1) {
                return game.serializeRule(words[0]);
            } else {
                if (game.started)
                    return 'The game has already started, so you can\'t set rules.';
                if (game.queue[0].id === msg.author.id) {
                    let res = game.setRule(words);
                    return res === true ? 'The rules have been updated!' + game.serializeRules() : 'Nothing has changed: ' + res;
                } else {
                    return 'You didn\'t create this game, so you can\'t set rules.';
                }
            }
        } else {
            if (words.length === 0) {
                return globalGame.serializeRules();
            } else if (words.length === 1) {
                return globalGame.serializeRule(words[0]);
            } else {
                return 'No game has been started yet, so you can\'t set rules.';
            }

        }
    },
    async p(msg, words) { return await commands.play(msg, words); },
    async pl(msg, words) { return await commands.play(msg, words); },
    async ply(msg, words) { return await commands.play(msg, words); },
    async play(msg, words) {
        let game = games[msg.channel.id];
        if (game) {
            if (!game.started) return "Sorry, but the game hasn't been started yet!";

            if (game.player.id !== msg.author.id) return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;

            let card = game.player.getCard(words);
            if (card === null) return;
            if (!card) return "It doesn't seem like you have that card! Try again.";

            if (!game.flipped.color || card.wild || card.id === game.flipped.id || card.color === game.flipped.color) {
                game.discard.push(card);
                game.player.hand.splice(game.player.hand.indexOf(card), 1);
                let pref = '';
                if (game.player.hand.length === 0) {
                    game.finished.push(game.player);
                    game.player.finished = true;
                    pref = `${game.player.member.user.username} has no more cards! They finished in **Rank #${game.finished.length}**! :tada:\n\n`;
                    if (2 === game.queue.length) {
                        game.finished.push(game.queue[1]);
                        pref += 'The game is now over. Thanks for playing! Here is the scoreboard:\n';
                        for (let i = 0; i < game.finished.length; i++) {
                            pref += `${i + 1}. **${game.finished[i].member.user.username}**\n`;
                        }
                        delete games[game.channel.id];
                        return pref;

                    }
                }

                let extra = '';
                switch (card.id) {
                    case 'REVERSE':
                        if (game.queue.length >= 2) {
                            let player = game.queue.shift();
                            game.queue.reverse();
                            game.queue.unshift(player);
                            extra = `Turns are now in reverse order! `;
                            break;
                        }
                    case 'SKIP':
                        game.queue.push(game.queue.shift());
                        extra = `Sorry, ${game.player.member.user.username}! Skip a turn! `;
                        break;
                    case '+2':
                        let amount = 0;
                        for (let i = game.discard.length - 1; i >= 0; i--) {
                            if (game.discard[i].id === '+2')
                                amount += 2;
                            else break;
                        }
                        game.deal(game.queue[1], amount);
                        extra = `${game.queue[1].member.user.username} picks up ${amount} cards! Tough break. `;
                        if (game.rules.DRAW_SKIP.value === true) {
                            extra += ' Also, skip a turn!';
                            game.queue.push(game.queue.shift());
                        }
                        break;
                    case 'WILD':
                        extra = `In case you missed it, the current color is now **${card.colorName}**! `;
                        break;
                    case 'WILD+4': {
                        // let player = game.queue.shift();
                        await game.deal(game.queue[1], 4);
                        // game.queue.unshift(player);
                        extra = `${game.queue[1].member.user.username} picks up 4! The current color is now **${card.colorName}**! `;
                        if (game.rules.DRAW_SKIP.value === true) {
                            extra += ' Also, skip a turn!';
                            game.queue.push(game.queue.shift());
                        }
                        break;
                    }
                }

                await game.next();
                return {
                    embed: {
                        description: `${pref}A **${game.flipped}** has been played. ${extra}\n\nIt is now ${game.player.member.user.username}'s turn!`,
                        thumbnail: { url: game.flipped.URL },
                        color: game.flipped.colorCode
                    }
                };
            } else return "Sorry, you can't play that card here!";

        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async d(msg, words) { return await commands.pickup(msg, words); },
    async draw(msg, words) { return await commands.pickup(msg, words); },
    async pickup(msg, words) {
        let game = games[msg.channel.id];
        if (game) {
            if (!game.started) return "Sorry, but the game hasn't been started yet!";

            if (game.player.id !== msg.author.id) return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;

            if (game.rules.MUST_PLAY.value === true) {
                for (const card of game.player.hand) {
                    if (!game.flipped.color || card.wild || card.id === game.flipped.id
                        || card.color === game.flipped.color) {
                        return 'Sorry, you have to play a card if you\'re able!';
                    }
                }
            }

            game.deal(game.player, 1);
            let player = game.player;
            await game.next();
            return {
                embed: {
                    description: `${player.member.user.username} picked up a card.\n\nA **${game.flipped}** was played last. \n\nIt is now ${game.player.member.user.username}'s turn!`,
                    thumbnail: { url: game.flipped.URL },
                    color: game.flipped.colorCode
                }
            };

        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async hand(msg, words) {
        let game = games[msg.channel.id];
        if (game) {
            if (!game.started) return "Sorry, but the game hasn't been started yet!";

            let player = game.players[msg.author.id];
            await player.sendHand();
            return 'You got it! I\'ve DMed you your hand.';
        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async start(msg, words) {
        let game = games[msg.channel.id];
        if (!game)
            return "A game isn't running right now.";

        if (game.queue.length > 1) {
            if (game.player.id !== msg.author.id)
                return "Sorry, but you can't start a game you didn't create!";
            await game.dealAll(game.rules.INITIAL_CARDS.value);
            game.discard.push(game.deck.pop());
            game.started = true;
            game.timeStarted = Date.now();
            return {
                embed: {
                    description: `The game has begun with ${game.queue.length} players! The currently flipped card is: **${game.flipped}**. \n\nIt is now ${game.player.member.user.username}'s turn!`,
                    thumbnail: { url: game.flipped.URL },
                    color: game.flipped.colorCode
                }
            };
        } else {
            return "There aren't enough people to play!";
        }
    },
    async invite(msg, words) {
        return '<https://discordapp.com/oauth2/authorize?client_id=403419413904228352&scope=bot&permissions=0>';
    },
    async stats(msg, words) {
        var memory = process.memoryUsage();
        return {
            embed: {
                fields: [
                    { name: 'RAM', value: memory.rss / 1024 / 1024 + 'MiB', inline: true },
                    { name: 'Guilds', value: client.guilds.size, inline: true },
                    { name: 'Games In Progress', value: Object.keys(games).length, inline: true }
                ]
            }
        };
    },
    async eval(msg, words, text) {
        if (msg.author.id !== '103347843934212096') return 'NOU';
        let code = `async () => {
    ${text}
}`;
        let func = eval(code);
        func = func.bind(this);
        try {
            let res = await func();
            return `\`\`\`js\n${res}\n\`\`\``;
        } catch (err) {
            return `\`\`\`js\n${err.stack}\n\`\`\``;
        }
    },
    async ping(msg, words) {
        return 'Pong!';
    },
    async table(msg, words) {
        let game = games[msg.channel.id];
        if (!game) {
            return 'There is no game created for this channel yet.';
        } else if (!game.started) {
            return `Here are the players in this game:\n${game.queue.map(p => `**${p.member.user.username}**`).join('\n')}`;
        } else {
            console.log(moment() - game.timeStarted);
            let diff = moment.duration(moment() - game.timeStarted);
            let d = [];
            if (diff.days() > 0) d.push(`${diff.days()} day${diff.days() === 1 ? '' : 's'}`);
            if (diff.hours() > 0) d.push(`${diff.hours()} hour${diff.hours() === 1 ? '' : 's'}`);
            if (diff.minutes() > 0) d.push(`${diff.minutes()} minute${diff.minutes() === 1 ? '' : 's'}`);
            if (d.length > 1) {
                d[d.length - 1] = 'and ' + d[d.length - 1];
            }
            d = d.join(', ');
            return {
                content: `Here are the players in this game:\n${game.queue.map(p => `**${p.member.user.username}** | ${p.hand.length} card(s)`).join('\n')}`
                    + `\n\nThis game has lasted **${d}**. **${game.drawn}** cards have been drawn!\n\n`,
                embed: {
                    description: `A ** ${game.flipped}** has been played.\n\nIt is currently ${game.player.member.user.username} 's turn!`,
                    thumbnail: { url: game.flipped.URL },
                    color: game.flipped.colorCode
                }
            };
        }
    },
    async['!'](msg, words) {
        let game = games[msg.channel.id];
        if (game && game.started && game.players[msg.author.id] && game.players[msg.author.id].hand.length === 1) {
            let p = game.players[msg.author.id];
            if (!p.called) {
                p.called = true;
                return `**UNO!!** ${p.member.user.username} only has one card left!`;
            } else return `You've already said UNO!`;
        }
    },
    async callout(msg, words) {
        let game = games[msg.channel.id];
        if (game && game.started && game.players[msg.author.id]) {
            if (game.rules.CALLOUTS.value === false) return 'Callouts have been disabled for this game.';
            let baddies = [];
            for (const player of game.queue) {
                if (/*player !== game.player &&*/ player.hand.length === 1 && !player.called) {
                    baddies.push(player);
                    player.called = true;
                }
            }
            game.dealAll(2, baddies);
            console.log(baddies);
            if (baddies.length > 0)
                return `Uh oh! ${baddies.map(p => `**${p.member.user.username}**`).join(', ')}, you didn't say UNO! Pick up 2!`;
            else {
                if (game.rules.CALLOUT_PENALTY.value <= 0)
                    return 'There is nobody to call out.';
                else {
                    await game.deal(game.players[msg.author.id], game.rules.CALLOUT_PENALTY.value);
                    return `There is nobody to call out. Pick up ${game.rules.CALLOUT_PENALTY.value}!`;
                }
            }
        } else {
            return 'You aren\'t even in the game!';
        }
    }
};



console.log('Connecting...');
client.connect();
