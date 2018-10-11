module.exports = {};

module.exports.rules = {
    DECKS: {
        desc: 'The number of decks to use.',
        value: 1,
        name: 'Decks',
        type: 'integer'
    },
    INITIAL_CARDS: {
        desc: 'How many cards to pick up at the beginning.',
        value: 7,
        name: 'Initial Cards',
        type: 'integer'
    },
    DRAW_SKIP: {
        desc: 'Whether pickup cards (+2, +4) should also skip the next person\'s turn.',
        value: true,
        name: 'Draws Skip',
        type: 'boolean'
    },
    MUST_PLAY: {
        desc: 'Whether someone must play a card if they are able to.',
        value: false,
        name: 'Must Play',
        type: 'boolean'
    },
    CALLOUTS: {
        desc: 'Gives the ability to call someone out for not saying uno!',
        value: true,
        name: 'Callouts',
        type: 'boolean'
    },
    CALLOUT_PENALTY: {
        desc: 'The number of cards to give someone when called out.',
        value: 2,
        name: 'Callout Penalty',
        type: 'integer'
    },
    FALSE_CALLOUT_PENALTY: {
        desc: 'The number of cards to give someone for falsely calling someone out.',
        value: 2,
        name: 'Callout Penalty',
        type: 'integer'
    },
    DRAW_AUTOPLAY: {
        desc: 'Automatically plays a card after drawing, if possible. Will not autoplay wild cards.',
        value: false,
        name: 'Automatically Play After Draw',
        type: 'boolean'
    },
    AUTOPASS: {
        desc: 'Automatically proceeds to the next turn after drawing, meaning that you cannot play drawn cards (without DRAW_AUTOPLAY).',
        wip: true,
        value: true,
        name: 'Automatically Pass Turns (WIP)',
        type: 'boolean'
    },

};

module.exports.ruleKeys = Object.keys(module.exports.rules);
// module.exports.ruleKeys.sort();