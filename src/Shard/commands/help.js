const BaseCommand = require('../BaseCommand');

module.exports = class HelpCommand extends BaseCommand {
  constructor(client) {
    super(client, 'help');
  }

  execute() {
    const prefix = this.client.prefix;

    let out = `:sparkles: **__UNO Commands__** :sparkles:\n
**${prefix.toUpperCase()} HELP** - Shows this message!
**${prefix.toUpperCase()} SUPPORT** - Gets a link to my support guild!
**${prefix.toUpperCase()} JOIN** - Joins (or creates) a game in the current channel!
**${prefix.toUpperCase()} QUIT** - Quits the game! Party pooper.
**${prefix.toUpperCase()} START** - Starts the game! Can only be used by the player who joined first.
**${prefix.toUpperCase()} TABLE** - Shows everyone at the table.
**${prefix.toUpperCase()} PLAY <colour> <value>** - Plays a card! Colours and values are interchangeable.
**${prefix.toUpperCase()} PICKUP** - Picks up a card!
**${prefix.toUpperCase()} CALLOUT** - Calls a player out for only having one card left!
**${prefix.toUpperCase()} HAND** - Checks your hand!
**${prefix.toUpperCase()} RULES** - Checks or sets the game rules!
**${prefix.toUpperCase()}!** - Let everyone know that you only have one card left!

You can execute up to two commands in a single message by separating them with \`&&\`!

Privacy Policy: <https://github.com/Ratismal/UNO/blob/master/privacy.md>`;

    return out;
  }
};
