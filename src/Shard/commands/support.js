const BaseCommand = require('../BaseCommand');

module.exports = class SupportCommand extends BaseCommand {
  constructor(client) {
    super(client, 'support');
  }

  async execute(msg) {
    let chan = await this.client.getDMChannel(msg.author.id);
    try {
      await chan.createMessage('Here\'s a link to my support server: https://discord.gg/H8KADM4');
      return 'Ok, I\'ve DMed you a link to my support server!';
    } catch (err) {
      console.log(err);
      return 'Sorry, I wasn\'t able to DM you. Check if you have them open, and try again.';
    }
  }
};
