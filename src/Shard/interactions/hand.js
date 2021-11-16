const { SlashCommand, } = require('slash-create');

module.exports = class Hand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'hand',
      description: 'Gets what cards are in your current hand.',
      options: [],
    });

    this.filePath = __filename;
  }

  async run(ctx) {
    try {
      let game = this.creator.botClient.games[ctx.channelID];
      if (game) {
        if (!game.started) {
          return {
            content: "Sorry, but the game hasn't been started yet!",
            ephemeral: true,
          };
        }

        let player = game.players[ctx.user.id];
        if (player) {
          return {
            content: player.getHand(),
            ephemeral: true,
          };
        } else {
          return {
            content: 'You aren\'t in this current game!',
            ephemeral: true,
          };
        }
      } else {
        return {
          content: "Sorry, but a game hasn't been created yet! Do `uno join` to create one.",
          ephemeral: true,
        };
      }
    } catch (err) {
      console.error(err);
      return {
        content: 'An error has occurred.',
        ephemeral: true,
      };
    }
  }
};
