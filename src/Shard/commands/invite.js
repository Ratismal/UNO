const BaseCommand = require('../BaseCommand');

module.exports = class InviteCommand extends BaseCommand {
  constructor(client) {
    super(client, 'invite');
  }

  execute() {
    return 'Regular invite: <https://discordapp.com/oauth2/authorize?client_id=403419413904228352&scope=bot&permissions=0>'
      + '\nWith slash commands (beta): '
      + '<https://discordapp.com/oauth2/authorize?client_id=403419413904228352&scope=bot%20applications.commands&permissions=0>';
  }
};
