const BaseCommand = require('../BaseCommand');

module.exports = class SyncCommandsCommand extends BaseCommand {
  constructor(client) {
    super(client, 'synccommands');
  }

  async execute(msg) {
    if (msg.author.id !== '103347843934212096') {return 'NOU';}
    this.client.creator.syncCommands();
    return 'Done.';
  }
};
