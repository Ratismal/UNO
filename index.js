const config = require('./config.json');
const Eris = require('eris');

const client = new Eris(config.token, { getAllUsers: true });
const prefix = config.prefix;

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.error(error);
});

client.on('ready', () => {
    console.log('ready!');
});

client.on('messageCreate', async (msg) => {
    if (msg.content.toLowerCase().startsWith(prefix)) {
        let segments = msg.content.substring(prefix.length).trim().split('&&');
        if (segments.length > 2) return await msg.channel.createMessage('Sorry, you can only execute up to **two** commands with a single message!');
        if (segments[1] && segments[1].toLowerCase().startsWith(prefix))
            segments[1] = segments[1].substring(prefix.length);
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

const games = {};

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
            game = games[msg.channel.id] = new Game(msg.channel);
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
                return 'A game has been registered! Once all players have joined, type `uno start` to begin the game!';
            } else {
                return 'You have joined the game! Please wait for it to start.'
            }
        }
    },
    async quit(msg, words) {
        let game = games[msg.channel.id];
        if (game && game.players.hasOwnProperty(msg.author.id)) {

            let out = 'You are no longer participating in the game.\n\n';

            if (game.started && game.queue.length <= 2) {
                game.finished.push(game.queue[0]);
                out += 'The game is now over. Thanks for playing! Here is the scoreboard:\n'
                for (let i = 0; i < game.finished.length; i++) {
                    out += `${i + 1}. **${game.finished[i].member.user.username}**\n`;
                }
                games[game.channel.id] = undefined;
                return out;
            }
            if (game.started) {
                game.next();
                out = {
                    embed: {
                        description: `${out}${pref}A **${game.flipped}** was played last. ${extra}\n\nIt is now ${game.player.member.user.username}'s turn!`,
                        thumbnail: { url: game.flipped.URL },
                        color: game.flipped.colorCode
                    }
                };
            }
            game.players[msg.author.id] = undefined;
            game.queue = game.queue.filter(p => p.id !== msg.author.id);
            return out;
        } else return 'You haven\'t joined!';
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
                        pref += 'The game is now over. Thanks for playing! Here is the scoreboard:\n'
                        for (let i = 0; i < game.finished.length; i++) {
                            pref += `${i + 1}. **${game.finished[i].member.user.username}**\n`;
                        }
                        games[game.channel.id] = undefined;
                        return pref;

                    }
                }

                let extra = '';
                switch (card.id) {
                    case 'SKIP':
                        game.queue.push(game.queue.shift());
                        extra = `Sorry, ${game.player.member.user.username}! Skip a turn! `;
                        break;
                    case 'REVERSE':
                        let player = game.queue.shift();
                        game.queue.reverse();
                        game.queue.unshift(player);
                        extra = `Turns are now in reverse order! `;
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
                        if (game.rules.drawSkip.value === true) {
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
                        if (game.rules.drawSkip.value === true) {
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
    async start(msg, words) {
        let game = games[msg.channel.id];
        if (game.queue.length > 1) {
            if (game.player.id !== msg.author.id)
                return "Sorry, but you can't start a game you didn't create!";
            await game.dealAll(game.rules.initialCards.value);
            game.discard.push(game.deck.pop());
            game.started = true;
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
        }
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
            return `Here are the players in this game:\n${game.queue.map(p => `**${p.member.user.username}** | ${p.hand.length} card(s)`).join('\n')}`;
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
            let baddies = [];
            for (const player of game.queue) {
                if (/*player !== game.player &&*/ player.hand.length === 1 && !player.called)
                    baddies.push(player);
            }
            game.dealAll(2, baddies);
            console.log(baddies);
            if (baddies.length > 0)
                return `Uh oh! ${baddies.map(p => `**${p.member.user.username}**`).join(', ')}, you didn't say UNO! Pick up 2!`;
            else 'There is nobody to call out.'
        } else {
            return 'You aren\'t even in the game!';
        }
    }
};

class Game {
    constructor(channel) {
        this.channel = channel;
        this.players = {};
        this.queue = [];
        this.deck = [];
        this.discard = [];
        this.finished = [];
        this.started = false;
        this.confirm = false;
        this.rules = {
            drawSkip: {
                desc: 'Whether pickup cards (+2, +4) should also skip the next person\'s turn.',
                value: true,
                name: 'Draws Skip'
            },
            initialCards: {
                desc: 'How many cards to pick up at the beginning.',
                value: 7,
                name: 'Initial Cards'
            }
        }
    }

    get player() {
        return this.queue[0];
    }

    get flipped() {
        return this.discard[this.discard.length - 1];
    }

    async next() {
        let p = this.queue.shift();
        if (!p.finished)
            this.queue.push(p);
        this.player.sendHand(true);
    }

    async send(content) {
        await client.createMessage(this.channel.id, content);
    }

    addPlayer(member) {
        if (!this.players[member.id]) {
            let player = this.players[member.id] = new Player(member, this);
            this.queue.push(player);
            return player;
        }
        else return null;
    }

    async dealAll(number, players = this.queue) {
        let cards = {};
        for (let i = 0; i < number; i++)
            for (const player of players) {
                if (this.deck.length === 0) {
                    if (this.discard.length === 1) break;
                    this.shuffleDeck();
                }
                let c = this.deck.pop();
                if (!cards[player.id]) cards[player.id] = [];
                cards[player.id].push(c.toString());
                player.hand.push(c);
            }
        for (const player of players) {
            player.called = false;
            if (cards[player.id].length > 0)
                await player.send('You were dealt the following card(s):\n' + cards[player.id].map(c => `**${c}**`).join(' | '));
        }
    }

    async deal(player, number) {
        let cards = [];
        for (let i = 0; i < number; i++) {
            if (this.deck.length === 0) {
                if (this.discard.length === 1) break;
                this.shuffleDeck();
            }
            let c = this.deck.pop();
            cards.push(c.toString());
            player.hand.push(c);
        }
        player.called = false;
        if (cards.length > 0)
            await player.send('You were dealt the following card(s):\n' + cards.map(c => `**${c}**`).join(' | '));
    }

    generateDeck() {
        for (const color of ['R', 'Y', 'G', 'B']) {
            this.deck.push(new Card('0', color));
            for (let i = 1; i < 10; i++)
                for (let ii = 0; ii < 2; ii++)
                    this.deck.push(new Card(i.toString(), color));
            for (let i = 0; i < 2; i++)
                this.deck.push(new Card('SKIP', color));
            for (let i = 0; i < 2; i++)
                this.deck.push(new Card('REVERSE', color));
            for (let i = 0; i < 2; i++)
                this.deck.push(new Card('+2', color));
        }
        for (let i = 0; i < 4; i++) {
            this.deck.push(new Card('WILD'))
            this.deck.push(new Card('WILD+4'))
        }

        this.shuffleDeck();
    }

    shuffleDeck() {
        var j, x, i, a = [].concat(this.deck, this.discard);
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        this.deck = a;
        this.send('*Thfwwp!* The deck has been shuffled.');
    }
}

class Player {
    constructor(member, game) {
        this.member = member;
        this.game = game;
        this.id = member.id;
        this.hand = [];
        this.called = false;
        this.finished = false;
    }

    sortHand() {
        this.hand.sort((a, b) => {
            return a.value > b.value;
        });
    }

    parseColor(color) {
        switch ((color || '').toLowerCase()) {
            case 'red':
            case 'r':
                color = 'R';
                break;
            case 'yellow':
            case 'y':
                color = 'Y';
                break;
            case 'green':
            case 'g':
                color = 'G';
                break;
            case 'blue':
            case 'b':
                color = 'B';
                break;
            default:
                color = '';
                break;
        }
        return color;
    }

    getCard(words) {
        let color, id;
        if (words.length === 1) {
            id = words[0];
        } else {
            color = words[0];
            id = words[1];
        }
        let _color = this.parseColor(color);
        if (!_color) {
            let temp = color;
            color = id;
            id = temp;
            _color = this.parseColor(color);
            if (!_color) {
                this.game.send('You have to specify a valid color! Colors are **red**, **yellow**, **green**, and **blue**.\n`uno play <color> <value>`');
                return null;
            }
        }
        color = _color;
        console.log(color, id);
        if (['WILD', 'WILD+4'].includes(id.toUpperCase())) {
            let card = this.hand.find(c => c.id === id.toUpperCase());
            if (!card) return undefined;
            card.color = color;
            return card;
        } else {

            return this.hand.find(c => c.id === id.toUpperCase() && c.color === color);
        }
    }

    async send(content) {
        let chan = await this.member.user.getDMChannel();
        await chan.createMessage(content);
    }

    async sendHand(turn = false) {
        this.sortHand();
        await this.send((turn ? "It's your turn! " : '') + 'Here is your hand:\n\n' + this.hand.map(h => `**${h}**`).join(' | ') + `\n\nYou currently have ${this.hand.length} card(s).`);
    }
}

class Card {
    constructor(id, color) {
        this.id = id;
        this.wild = false;
        this.color = color;
        if (!this.color) this.wild = true;
    }

    get colorName() {
        return {
            R: 'Red',
            Y: 'Yellow',
            G: 'Green',
            B: 'Blue'
        }[this.color];
    }

    get colorCode() {
        return {
            R: 0xff5555,
            Y: 0xffaa00,
            G: 0x55aa55,
            B: 0x5555ff
        }[this.color] || 0x080808
    }

    get URL() {
        return `https://raw.githubusercontent.com/Ratismal/UNO/master/cards/${this.color || ''}${this.id}.png`
    }

    get value() {
        let val = 0;
        switch (this.color) {
            case 'R': val += 100000; break;
            case 'Y': val += 10000; break;
            case 'G': val += 1000; break;
            case 'B': val += 100; break;
            default: val += 1000000; break;
        }
        switch (this.id) {
            case 'SKIP': val += 10; break;
            case 'REVERSE': val += 11; break;
            case '+2': val += 12; break;
            case 'WILD': val += 13; break;
            case 'WILD+4': val += 14; break;
            default: val += parseInt(this.id); break;
        }
        return val;
    }

    toString() {
        if (this.color)
            return this.colorName + ' ' + this.id;
        else return this.id;
    }
}

client.connect();