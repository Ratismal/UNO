const config = require('./config.json');
const Eris = require('eris');

const client = new Eris(config.token);
const prefix = 'uno';

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.error(error);
});

client.on('ready', () => {
    console.log('ready!');
});

client.on('messageCreate', async (msg) => {
    if (msg.content.toLowerCase().startsWith(prefix)) {
        let text = msg.content.substring(prefix.length).trim();
        let words = text.split(/\s+/);
        let name = words.shift().toLowerCase();
        if (commands.hasOwnProperty(name)) {
            let res = await commands[name](msg, words);
            if (typeof res === 'string')
                await msg.channel.createMessage(res);
        }
    }
});

const games = {};

const commands = {
    async join(msg, words) {
        let game = games[msg.channel.id];
        if (!game) {
            game = games[msg.channel.id] = new Game(msg.channel);
            game.generateDeck();
            console.log(game.deck.join('\n'), '\n\n', 'Total Cards: ' + game.deck.length);
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
    async play(msg, words) {
        let game = games[msg.channel.id];
        if (game) {
            if (!game.started) return "Sorry, but the game hasn't been started yet!";

            if (game.queue[0].id !== msg.author.id) return `It's not your turn yet! It's currently ${game.queue[0].member.user.username}'s turn.`;

            let card = game.queue[0].getCard(words);
            if (!card) return "It doesn't seem like you have that card! Try again.";

            if (!card.color || card.id === game.flipped.id || card.color === game.flipped.color) {
                game.discard.push(card);
                game.queue[0].hand.splice(game.queue[0].hand.indexOf(card), 1);

                game.queue.push(game.queue.shift());
                return `A ${game.flipped} has been played. It is now ${game.queue[0].member.user.username}'s turn!`;
            } else return "Sorry, you can't play that card here!";

        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async start(msg, words) {
        let game = games[msg.channel.id];
        if (game.queue.length > 1) {
            if (game.queue[0].id !== msg.author.id)
                return "Sorry, but you can't start a game you didn't create!";
            game.dealAll(7);
            game.discard.push(game.deck.pop());
            for (const player of game.queue) {
                console.log(player.hand.join(' | '));
                await player.sendHand();
            }
            game.started = true;
            return `The game has begun with ${game.queue.length} players! The currently flipped card is: ${game.flipped}`;
        } else {
            return "There aren't enough people to play!";
        }
    },
    async ping(msg, words) {
        return 'Pong!';
    }
};

class Game {
    constructor(channel) {
        this.channel = channel;
        this.players = {};
        this.queue = [];
        this.deck = [];
        this.discard = [];
        this.started = false;
    }

    get flipped() {
        return this.discard[this.discard.length - 1];
    }

    addPlayer(member) {
        if (!this.players[member.id]) {
            let player = this.players[member.id] = new Player(member);
            this.queue.push(player);
            return player;
        }
        else return null;
    }

    dealAll(number) {
        for (let i = 0; i < number; i++)
            for (const player of this.queue) {
                player.hand.push(this.deck.pop());
            }
    }

    deal(player, number) {
        for (let i = 0; i < number; i++)
            player.hand.push(this.deck.pop());
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
    }
}

class Player {
    constructor(member) {
        this.member = member;
        this.id = member.id;
        this.hand = [];
    }

    sortHand() {
        this.hand.sort((a, b) => {
            return a.value > b.value;
        });
    }

    getCard(words) {
        let color, id;
        if (words.length === 1) {
            id = words[0];
        } else {
            color = words[0];
            id = words[1];
        }
        console.log(color, id);
        return this.hand.find(c => c.id.toLowerCase() === id.toLowerCase() &&
            ((color === undefined === c.color) || (c.color.toLowerCase() === color.toLowerCase()[0])));
    }

    async sendHand() {
        let chan = await this.member.user.getDMChannel();
        this.sortHand();
        await chan.createMessage('Here is your hand:\n\n' + this.hand.map(h => `**${h}**`).join(' | ') + `\n\nYou currently have ${this.hand.length} card(s).`);
    }
}

class Card {
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }

    get colorName() {
        return {
            R: 'Red',
            Y: 'Yellow',
            G: 'Green',
            B: 'Blue'
        }[this.color];
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