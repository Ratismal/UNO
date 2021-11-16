const BaseCommand = require('../BaseCommand');

module.exports = class RestartCommand extends BaseCommand {
  constructor(client) {
    super(client, 'restart');
  }

  async execute(msg, words) {
    if (msg.author.id !== '103347843934212096') {return 'NOU';}
    this.client.sender.send('restart', { kill: words[0] === 'kill', });
    return 'Ok, bot is restarting.';
  }
};
