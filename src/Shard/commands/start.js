const BaseCommand = require('../BaseCommand');

module.exports = class StartCommand extends BaseCommand {
  constructor(client) {
    super(client, 'start');
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (!game)
    {return "A game isn't running right now.";}

    if (game.queue.length > 1) {
      if (game.started) {return 'The game has already started!';}

      if (game.player.id !== msg.author.id)
      {return "Sorry, but you can't start a game you didn't create!";}
      await game.start();
      // flip top card before dealing. this is wrong, i know, but accounts for using all
      // the cards in the dealing phase

      return game.embed(`The game has begun with ${game.queue.length} players! The currently flipped card is: **${game.flipped}**.
      
It is now ${game.player.member.user.username}'s turn!`);
    } else {
      return "There aren't enough people to play!";
    }
  }
};
