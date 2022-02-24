const BaseCommand = require('../BaseCommand');

module.exports = class HandCommand extends BaseCommand {
  constructor(client) {
    super(client, 'hand');
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (game) {
      if (!game.started) {
        return "Sorry, but the game hasn't been started yet!";
      }

      let player = game.players[msg.author.id];
      if (!player) {
        return 'Sorry, but you are not a part of this game!';
      }
      await player.sendHand();
      return 'You got it! I\'ve DMed you your hand.';
    } else {
      return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    }
  }

  async interact(interaction) {
    let game = this.games[interaction.channel.id];
    if (game) {
      if (!game.started) {
        return "Sorry, but the game hasn't been started yet!";
      }

      let player = game.players[interaction.member.id];
      if (!player) {
        return 'Sorry, but you are not a part of this game!';
      }

      const hand = player.getHand();
      return hand;
    } else {
      return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";
    }
  }
};
