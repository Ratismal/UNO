const BaseCommand = require('../BaseCommand');

module.exports = class MEvalCommand extends BaseCommand {
  constructor(client) {
    super(client, 'meval');
  }

  async execute(msg, words, text) {
    if (msg.author.id !== '103347843934212096') { return 'NOU'; }
    text = text.trim();
    let code = `async () => {
  ${text}
}`;
    if (text.indexOf('\n') === -1 && !text.startsWith('return')) {
      code = `async () => ${text}`;
    }

    const { res, } = await this.client.sender.awaitMessage({
      message: 'eval',
      code,
    });

    return `\`\`\`js\n${res}\n\`\`\``;
  }
};
