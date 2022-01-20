const BaseCommand = require('../BaseCommand');

module.exports = class PingCommand extends BaseCommand {
  constructor(client) {
    super(client, 'uno', {
      aliases: ['!', 'uno!'],
    });
  }

  execute(msg) {
    let game = this.games[msg.channel.id];
    if (game && game.started && game.players[msg.author.id] && game.players[msg.author.id].hand.length === 1) {
      let p = game.players[msg.author.id];
      game.log('uno', msg.author.id);
      if (!p.called) {
        p.called = true;
        return `**UNO!!** ${p.member.user.username} only has one card left!`;
      } else {
        return 'You\'ve already said UNO!';
      }
    }
  }
};
