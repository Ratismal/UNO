const BaseCommand = require('../BaseCommand');

module.exports = class CalloutCommand extends BaseCommand {
  constructor(client) {
    super(client, 'callout');
  }

  async execute(msg) {
    let game = this.games[msg.channel.id];
    if (game && game.started && game.players[msg.author.id] && !game.players[msg.author.id].finished) {
      if (game.rules.CALLOUTS === false) {return 'Callouts have been disabled for this game.';}
      let baddies = [];
      for (const player of game.queue) {
        if (/*player !== game.player &&*/ player.hand.length === 1 && !player.called) {
          baddies.push(player);
          player.called = true;
        }
      }
      game.log('callout', msg.author.id, { targets: baddies.map(p => p.id), });

      game.dealAll(Math.max(1, game.rules.CALLOUT_PENALTY), baddies);
      console.log('Called Out Players:', baddies);
      if (baddies.length > 0) {
        return `Uh oh! ${baddies.map(p =>
          `**${p.member.user.username}**`)
          .join(', ')
        }, you didn't say UNO! Pick up ${Math.max(1, game.rules.CALLOUT_PENALTY)}!`;
      }
      else {
        if (game.rules.FALSE_CALLOUT_PENALTY <= 0)
        {return 'There is nobody to call out.';}
        else {
          await game.deal(game.players[msg.author.id], game.rules.FALSE_CALLOUT_PENALTY);
          return `There is nobody to call out. Pick up ${game.rules.FALSE_CALLOUT_PENALTY}!`;
        }
      }
    } else {
      return 'You aren\'t even in the game!';
    }
  }
};
