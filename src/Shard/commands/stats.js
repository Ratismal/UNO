const BaseCommand = require('../BaseCommand');

module.exports = class RestartCommand extends BaseCommand {
  constructor(client) {
    super(client, 'stats', {
      aliases: ['info'],
    });
  }

  async execute() {
    const { stats, } = await this.client.sender.awaitMessage('requestStats');
    return {
      embeds: [{
        fields: [
          { name: 'RAM', value: stats.rss + 'MiB', inline: true, },
          { name: 'Clusters', value: stats.clusters, inline: true, },
          { name: 'Current Cluster', value: process.env.CLUSTER_ID, inline: true, },
          { name: 'Guilds', value: stats.guilds, inline: true, },
          { name: 'Games In Progress', value: stats.games, inline: true, },
          { name: 'Holiday Card Designers', inline: false, value: 'Fubar#1972', }
        ],
      }],
    };
  }
};
