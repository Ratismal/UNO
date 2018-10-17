const Player = require('./Player');
const Card = require('./Card');
const moment = require('moment');

module.exports = class Game {
    constructor(client, channel) {
        this.client = client;
        this.channel = channel;
        this.players = {};
        this.queue = [];
        this.deck = [];
        this.discard = [];
        this.finished = [];
        this.started = false;
        this.confirm = false;
        this.lastChange = Date.now();
        this.drawn = 0;
        this.timeStarted = null;
        this.rules = client.ruleset;
    }

    static deserialize(obj, client) {
        let channel = client.getChannel(obj.channel);
        if (!channel) return null;
        let game = new Game(client, channel);
        for (const id in obj.players) {
            game.players[id] = Player.deserialize(obj.players[id], game);
        }
        game.queue = obj.queue.map(p => game.players[p]);
        game.deck = obj.deck.map(c => Card.deserialize(c));
        game.discard = obj.discard.map(c => Card.deserialize(c));
        game.finished = obj.finished.map(p => game.players[p]);
        game.started = obj.started;
        game.confirm = obj.confirm;
        game.lastChange = Date.now(); // set to current date to account for potential downtime
        game.rules = obj.rules;
        game.timeStarted = obj.timeStarted || (obj.started ? Date.now() : null);
        game.drawn = obj.drawn || 0;
        return game;
    }

    serialize() {
        let obj = {
            channel: this.channel.id,
            players: {},
            queue: this.queue.map(p => p.id),
            deck: this.deck.map(c => c.serialize()),
            discard: this.discard.map(c => c.serialize()),
            finished: this.finished.map(p => p.id),
            started: this.started,
            confirm: this.confirm,
            lastChange: Date.now(),
            rules: this.rules,
            timeStarted: this.timeStarted,
            drawn: this.drawn
        };
        for (const id in this.players) {
            obj.players[id] = this.players[id].serialize();
        }

        return obj;
    }

    serializeRule(key) {
        key = key.toUpperCase();
        let rule = this.client.rules[key];
        if (!rule) return 'There is no rule with that key.';
        return `**${rule.name}**\nKey: ${key}\nType: ${rule.type}\nValue: ${this.rules[key]}\n\n${rule.desc}`;
    }

    serializeRules() {
        let len = Object.keys(this.rules).reduce((acc, cur) => {
            return cur.length > acc ? cur.length : acc;
        }, 0);
        let f = (_, key, value) => {
            return `${key.padEnd(len, ' ')} = ${value}\n`;
        };
        let out = '```ini\n'
        for (const key of this.client.ruleKeys) {
            if (this.client.rules[key].wip) continue;
            out += f`${key}${this.rules[key]}`;
        }
        out += '```';
        return out;
    }

    setRule(words) {
        if (words.length % 2 === 1) return 'Provided a key without a value'
        let rules = JSON.parse(JSON.stringify(this.rules));
        for (let i = 0; i < words.length; i += 2) {
            let key = words[i], value = words[i + 1];
            key = key.toUpperCase();
            let rule = this.client.rules[key];
            if (!rule) return 'invalid key';

            switch (rule.type) {
                case 'boolean':
                    try {
                        value = JSON.parse(value);
                    } catch (err) { }
                    finally {
                        if (typeof value !== 'boolean')
                            return `${key}: Expected a boolean value, but received a ${typeof value}`;
                    }
                    break;
                case 'integer':
                    try {
                        value = Number(value);
                    } catch (err) { }
                    finally {
                        if (typeof value !== 'number')
                            return `${key}: Expected a number value, but received a ${typeof value}`;
                        if (typeof rule.min === 'number' && value < rule.min)
                            return `${key}: Expected a value greater than or equal to ${rule.min}, but received ${value}`;
                        if (typeof rule.max === 'number' && value > rule.max)
                            return `${key}: Expected a value less than or equal to ${rule.max}, but received ${value}`;
                    }
                    break;
            }
            rules[key] = value;
        }
        this.rules = rules;
        return true;
    }

    get player() {
        return this.queue[0];
    }

    get flipped() {
        return this.discard[this.discard.length - 1];
    }

    async next() {
        this.queue.push(this.queue.shift());
        this.queue = this.queue.filter(p => !p.finished);
        this.player.sendHand(true);
        this.lastChange = Date.now();
    }

    async send(content) {
        await this.client.createMessage(this.channel.id, content);
    }

    addPlayer(member) {
        this.lastChange = Date.now();
        if (!this.players[member.id]) {
            let player = this.players[member.id] = new Player(member, this);
            this.queue.push(player);
            return player;
        }
        else return null;
    }

    async notifyPlayer(player, cards = player.hand) {
        try {
            await player.send('You were dealt the following card(s):\n' + cards.map(c => `**${c}**`).join(' | '));
        } catch (err) {
            await this.send(`Hey <@${player.id}>, I can't DM you! Please make sure your DMs are enabled, and run \`uno hand\` to see your cards.`);
        }
    }

    embed(desc) {
        return {
            embed: {
                description: desc,
                thumbnail: { url: this.flipped.URL },
                color: this.flipped.colorCode,
                footer: {
                    text: `Decks: ${this.rules.DECKS} (${this.rules.DECKS * 108} cards) | Remaining: ${this.deck.length} | Discarded: ${this.discard.length}`,
                    icon_url: 'https://raw.githubusercontent.com/Ratismal/UNO/master/cards/logo.png'
                },
                timestamp: moment(this.timeStarted),
            }
        }
    }

    scoreboard() {
        let out = 'The game is now over. Thanks for playing! Here is the scoreboard:\n';
        for (let i = 0; i < this.finished.length; i++) {
            out += `${i + 1}. **${this.finished[i].member.user.username}**\n`;
        }
        let diff = moment.duration(moment() - this.timeStarted);
        let d = [];
        if (diff.days() > 0) d.push(`${diff.days()} day${diff.days() === 1 ? '' : 's'}`);
        if (diff.hours() > 0) d.push(`${diff.hours()} hour${diff.hours() === 1 ? '' : 's'}`);
        d.push(`${diff.minutes()} minute${diff.minutes() === 1 ? '' : 's'}`);
        if (d.length > 1) {
            d[d.length - 1] = 'and ' + d[d.length - 1];
        }
        d = d.join(', ');

        out += `\nThis game lasted **${d}**, and **${this.drawn}** cards were drawn!`;
        return out;
    }

    async start() {
        this.generateDeck();

        this.discard.push(this.deck.pop());
        await this.dealAll(this.rules.INITIAL_CARDS);
        this.started = true;
        this.timeStarted = Date.now();
    }

    async dealAll(number, players = this.queue) {
        let cards = {};
        for (let i = 0; i < number; i++) {
            let br = false;
            for (const player of players) {
                if (this.deck.length === 0) {
                    if (this.discard.length <= 1) { br = true; break; }
                    this.shuffleDeck();
                }
                let c = this.deck.pop();
                if (!c) { br = true; break; }
                if (!cards[player.id]) cards[player.id] = [];
                cards[player.id].push(c.toString());
                player.hand.push(c);
                this.drawn++;
            }
            if (br) break;
        }
        for (const player of players) {
            player.cardsChanged();
            player.called = false;
            if (cards[player.id].length > 0)
                await this.notifyPlayer(player, cards[player.id]);

        }
    }

    async deal(player, number) {
        let cards = [];
        for (let i = 0; i < number; i++) {
            if (this.deck.length === 0) {
                if (this.discard.length <= 1) break;
                this.shuffleDeck();
            }
            let c = this.deck.pop();
            cards.push(c);
            player.hand.push(c);
            this.drawn++;
        }
        player.cardsChanged();
        player.called = false;
        if (cards.length > 0)
            await this.notifyPlayer(player, cards.map(c => c.toString()));

        return cards;
    }

    generateDeck() {
        for (let d = 0; d < this.rules.DECKS; d++) {
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
                this.deck.push(new Card('WILD'));
                this.deck.push(new Card('WILD+4'));
            }
        }

        this.shuffleDeck();
    }

    shuffleDeck() {
        let top = this.discard.pop();
        var j, x, i, a = [].concat(this.deck, this.discard);
        if (a.length > 0)
            for (i = a.length - 1; i > 0; i--) {
                j = Math.floor(Math.random() * (i + 1));
                x = a[i];
                a[i] = a[j];
                a[j] = x;
            }
        this.deck = a;
        for (const card of this.deck.filter(c => c.wild))
            card.color = undefined;
        if (top)
            this.discard.push(top);
        this.send('*Thfwwp!* The deck has been shuffled.');
    }
}
