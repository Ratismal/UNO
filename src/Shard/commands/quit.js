const BaseCommand = require('../BaseCommand');

module.exports = class QuitCommand extends BaseCommand {
  constructor(client) {
    super(client, 'quit');
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (game && game.players.hasOwnProperty(msg.author.id)) {
      let out = 'You are no longer participating in the game.\n\n';

      out += await this.client.gameManager.removePlayerFromGame(game, msg.author);

      return out;
    } else {return 'You haven\'t joined!';}
  }
};
