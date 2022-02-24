const BaseCommand = require('../BaseCommand');
const Game = require('../../Structures/Game');

module.exports = class RulesCommand extends BaseCommand {
  constructor(client) {
    super(client, 'rules');
  }

  async execute(msg, words) {
    let game = this.games[msg.channel.id];
    if (game) {
      if (words.length === 0) {
        return game.serializeRules();
      } else if (words.length === 1) {
        return game.serializeRule(words[0]);
      } else {
        if (game.started)
        {return 'The game has already started, so you can\'t set rules.';}
        if (game.queue[0].id === msg.author.id) {
          let res = game.setRule(words);
          return res === true ? 'The rules have been updated!' + game.serializeRules() : 'Nothing has changed: ' + res;
        } else {
          return 'You didn\'t create this game, so you can\'t set rules.';
        }
      }
    } else {
      let channel = (await this.client.db.channel.findOrCreate({
        where: {
          id: msg.channel.id,
        },
      }))[0];
      let game = new Game(this.client, msg.channel);
      await game.init();

      if (words.length === 0) {
        return game.serializeRules();
      } else if (words.length === 1) {
        return game.serializeRule(words[0]);
      } else {
        let perms = msg.channel.permissionsOf(msg.author.id);
        if (perms.has('manageMessages')) {
          let res = game.setRule(words);
          await channel.update({
            rules: game.rules,
          });
          return res === true ? 'The global rules have been updated!' + game.serializeRules() : 'Nothing has changed: ' + res;
        } else {
          return 'You do not have manage messages, so you cannot set global rules.';
        }
      }
    }
  }
};
