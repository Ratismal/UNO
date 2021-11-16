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
    let func = eval(code);
    func = func.bind(this);
    try {
      let res = await func();
      return `\`\`\`js\n${res}\n\`\`\``;
    } catch (err) {
      return `\`\`\`js\n${err.stack}\n\`\`\``;
    }
  }
};
