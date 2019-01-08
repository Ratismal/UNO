module.exports = class Card {
    constructor(id, color) {
        this.id = id;
        this.wild = false;
        this.color = color;
        if (!this.color) this.wild = true;
    }

    static deserialize(obj) {
        let card = new Card(obj.id, obj.color);
        card.wild = obj.wild;

        return card;
    }

    serialize() {
        let obj = {
            id: this.id,
            wild: this.wild,
            color: this.color
        };

        return obj;
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
        }[this.color] || 0x080808;
    }

    get URL() {
        return `https://raw.githubusercontent.com/Ratismal/UNO/master/cards/${this.color || ''}${this.id}.png`;
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