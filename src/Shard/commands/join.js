const BaseCommand = require('../BaseCommand');
const Game = require('../../Structures/Game');

module.exports = class JoinCommand extends BaseCommand {
  constructor(client) {
    super(client, 'join');
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (!game) {
      game = this.games[msg.channel.id] = new Game(this.client, msg.channel);
      await game.init();
    }
    if (game.started) {
      return 'Sorry, this game has already started!';
    }
    let res = game.addPlayer(msg.member);
    if (res === null)
    {return "You've already registered for this game!";}
    else {
      if (game.queue.length === 1) {
        return 'A game has been registered with you as the leader! Once all players have joined, type `uno start` to begin the game!'
          + '\n\nThe rules for this game are:\n' + game.serializeRules()
          + '\nYou can configure these or get a description with the `rules` command (uno rules <key> [value])';
      } else {
        return 'You have joined the game! Please wait for it to start.';
      }
    }
  }
};
