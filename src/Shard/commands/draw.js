const BaseCommand = require('../BaseCommand');

module.exports = class DrawCommand extends BaseCommand {
  constructor(client) {
    super(client, 'draw', {
      aliases: ['pickup', 'd'],
    });
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (game) {
      if (!game.started) {return "Sorry, but the game hasn't been started yet!";}

      if (game.player.id !== msg.author.id) {return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;}

      if (game.rules.MUST_PLAY === true) {
        for (const card of game.player.hand) {
          if (!game.flipped.color || card.wild || card.id === game.flipped.id
            || card.color === game.flipped.color) {
            return 'Sorry, you have to play a card if you\'re able!';
          }
        }
      }

      let [card] = await game.deal(game.player, 1);
      if (game.rules.DRAW_AUTOPLAY === true
        && (!game.flipped.color || card.wild || card.id === game.flipped.id || card.color === game.flipped.color)) {
        return await this.client.getCommand('play').execute(msg, card.toString().split(' '), true);
      }
      let player = game.player;
      await game.next();
      return game.embed(`${player.member.user.username} picked up a card.

A **${game.flipped}** was played last.

It is now ${game.player.member.user.username}'s turn!`);
    } else {return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";}
  }
};
