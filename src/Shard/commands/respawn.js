const BaseCommand = require('../BaseCommand');

module.exports = class RespawnCommand extends BaseCommand {
  constructor(client) {
    super(client, 'respawn');
  }

  async execute(msg, words) {
    if (msg.author.id !== '103347843934212096') {return 'NOU';}
    this.client.sender.send('respawn', { shard: words[0] || process.env.CLUSTER_ID, });
    return 'Ok, shard is respawning.';
  }
};
