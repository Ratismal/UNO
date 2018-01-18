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

            if (game.player.id !== msg.author.id) return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;

            let card = game.player.getCard(words);
            if (!card) return "It doesn't seem like you have that card! Try again.";

            if (!card.color || card.id === game.flipped.id || card.color === game.flipped.color) {
                game.discard.push(card);
                game.player.hand.splice(game.player.hand.indexOf(card), 1);

                await game.next();
                return `A ${game.flipped} has been played. It is now ${game.player.member.user.username}'s turn!`;
            } else return "Sorry, you can't play that card here!";

        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async pickup(msg, words) {
        let game = games[msg.channel.id];
        if (game) {
            if (!game.started) return "Sorry, but the game hasn't been started yet!";

            if (game.player.id !== msg.author.id) return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;

            game.deal(game.player, 1);
            let player = game.player;
            await game.next();
            return `${player.member.user.username} picked up a card.\n\nA ${game.flipped} was played last. It is now ${game.player.member.user.username}'s turn!`;

        } else return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    },
    async start(msg, words) {
        let game = games[msg.channel.id];
        if (game.queue.length > 1) {
            if (game.player.id !== msg.author.id)
                return "Sorry, but you can't start a game you didn't create!";
            await game.dealAll(7);
            game.discard.push(game.deck.pop());
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

    get player() {
        return this.queue[0];
    }

    get flipped() {
        return this.discard[this.discard.length - 1];
    }

    async next() {
        this.queue.push(this.queue.shift());
        this.player.sendHand(true);
    }

    addPlayer(member) {
        if (!this.players[member.id]) {
            let player = this.players[member.id] = new Player(member);
            this.queue.push(player);
            return player;
        }
        else return null;
    }

    async dealAll(number) {
        let cards = {};
        for (let i = 0; i < number; i++)
            for (const player of this.queue) {
                let c = this.deck.pop();
                if (!cards[player.id]) cards[player.id] = [];
                cards[player.id].push(c.toString());
                player.hand.push(c);
            }
        for (const player of this.queue) {
            await player.send('You were dealt the following card(s):\n' + cards[player.id].map(c => `**${c}**`).join(' | '));
        }
    }

    async deal(player, number) {
        let cards = [];
        for (let i = 0; i < number; i++) {
            let c = this.deck.pop();
            cards.push(c.toString());
            player.hand.push(c);
        }
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