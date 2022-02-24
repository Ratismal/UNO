const BaseCommand = require('../BaseCommand');

module.exports = class PingCommand extends BaseCommand {
  constructor(client) {
    super(client, 'ping');
  }

  execute() {
    return 'Pong!';
  }
};
