const BaseCommand = require('../BaseCommand');
const moment = require('moment');

module.exports = class TableCommand extends BaseCommand {
  constructor(client) {
    super(client, 'table');
  }

  execute(msg) {
    let game = this.games[msg.channel.id];
    if (!game) {
      return 'There is no game created for this channel yet.';
    } else if (!game.started) {
      return `Here are the players in this game:\n${game.queue.map(p => `**${p.member.user.username}**`).join('\n')}`;
    } else {
      let diff = moment.duration(moment() - game.timeStarted);
      let d = [];
      if (diff.days() > 0) {d.push(`${diff.days()} day${diff.days() === 1 ? '' : 's'}`);}
      if (diff.hours() > 0) {d.push(`${diff.hours()} hour${diff.hours() === 1 ? '' : 's'}`);}
      d.push(`${diff.minutes()} minute${diff.minutes() === 1 ? '' : 's'}`);
      if (d.length > 1) {
        d[d.length - 1] = 'and ' + d[d.length - 1];
      }
      d = d.join(', ');
      let out = game.embed(`A ** ${game.flipped}** has been played.\n\nIt is currently ${game.player.member.user.username} 's turn!`);
      out.content = `Here are the players in this game:\n${game.queue.map(p =>
        `**${p.member.user.username}** | ${p.hand.length} card(s)`).join('\n')}`
        + `\n\nThis game has lasted **${d}**. **${game.drawn}** cards have been drawn!\n\n`;
      return out;
    }
  }
};
