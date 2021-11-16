module.exports = class BaseCommand {
  constructor(client, name, options = {}) {
    this.client = client;
    this.name = name;

    this.aliases = options.aliases || [];
  }

  get games() {
    return this.client.games;
  }

  execute(msg) {

  }
}