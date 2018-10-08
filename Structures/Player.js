const Card = require('./Card');

module.exports = class Player {
    constructor(member, game) {
        this.member = member;
        this.game = game;
        this.id = member.id;
        this.hand = [];
        this.called = false;
        this.finished = false;
    }

    static deserialize(obj, game) {
        let member = game.channel.guild.members.get(obj.id);
        let player = new Player(member, game);
        player.called = obj.called;
        player.finished = obj.finished;
        player.hand = obj.hand.map(c => Card.deserialize(c));

        return player;
    }

    serialize() {
        let obj = {
            id: this.id,
            hand: this.hand.map(c => c.serialize()),
            called: this.called,
            finished: this.finished
        };

        return obj;
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
            let f = words[0][0].toLowerCase();
            let _c = this.parseColor(f);
            if (_c) {
                color = _c;
                id = words[0].substring(1);
            } else
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
        let alias = { 'W': 'WILD', 'W+4': 'WILD+4' };
        if (alias[id.toUpperCase()]) id = alias[id.toUpperCase()];
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
        try {
            await this.send((turn ? "It's your turn! " : '') + 'Here is your hand:\n\n' + this.hand.map(h => `**${h}**`).join(' | ') + `\n\nYou currently have ${this.hand.length} card(s).`);
        } catch (err) {
            await this.game.send(`Hey <@${this.id}>, I can't DM you! Please make sure your DMs are enabled, and run \`uno hand\` to see your cards.`);
        }
    }
}
