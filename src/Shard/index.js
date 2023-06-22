require('../logger');
const config = require('../../config.json');

const Dysnomia = require('@projectdysnomia/dysnomia');
const fs = require('fs'), path = require('path');
const { Game, } = require('../Structures');
const Sequelize = require('sequelize');
const db = require('../../models');
const Sender = require('./Sender');
const GameManager = require('./GameManager');

let conf = {
  gateway: {
    getAllUsers: false,
    maxShards: Number(process.env.SHARDS_MAX),
    firstShardID: Number(process.env.SHARDS_FIRST),
    lastShardID: Number(process.env.SHARDS_LAST),
    intents: [
      'guilds',
      'guildMessages',
      'guildMembers',
      'directMessages',
      'messageContent'
    ],
  },

  restMode: true,
};
if (config.shard) {
  conf.firstShardID = config.shard;
  conf.lastShardID = config.shard;
}

const queryCache = {};

const { rules, ruleKeys, } = require('../rules');

let ready = false;

class Client extends Dysnomia.Client {
  constructor(...args) {
    super(...args);

    this.prefix = config.prefix;
    this.db = db;
    this.sender = new Sender(this);

    this.interactions = {};

    this.gameManager = new GameManager(this);

    this.commands = {};
    this.commandMap = {};

    this.loadCommands();
  }

  getCommand(name) {
    const commandName = this.commandMap[name];

    return this.commands[commandName];
  }

  loadCommands() {
    const files = fs.readdirSync(path.join(__dirname, 'commands'));

    for (const file of files) {
      if (file.endsWith('.js')) {
        const Command = require('./commands/' + file);
        const command = new Command(this);

        this.commands[command.name] = command;
        this.commandMap[command.name] = command.name;

        for (const alias of command.aliases) {
          this.commandMap[alias] = command.name;
        }
      }
    }
  }

  get config() {
    return config;
  }

  get rules() {
    return rules;
  }

  get ruleKeys() {
    return ruleKeys;
  }

  get games() {
    return this.gameManager.games;
  }

  get ruleset() {
    let obj = {};
    for (const key of Object.keys(rules)) {
      obj[key] = rules[key].value;
    }
    return obj;
  }

  wsEvent(code, data) {
    if (this.sender) {
      this.sender.send('emitToWebsocket', { code, data, });
    }
  }

  awaitQuery(channelId, userId, message) {
    return new Promise((res, rej) => {
      if (!queryCache[channelId]) {queryCache[channelId] = {};}
      if (queryCache[channelId][userId])
      {queryCache[channelId][userId].reject();}

      queryCache[channelId][userId] = {
        resolve: res, reject: rej,
      };
      this.createMessage(channelId, message);
    });
  }
}

const client = new Client(config.token, conf);
const prefix = config.prefix;

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error(error);
});

client.on('ready', async() => {
  console.log('ready!');
  client.sender.send('ready', null);

  console.info('Attemting to load in-progress games...');
  try {
    const channels = await db.channel.findAll({
      where: {
        game: { [Sequelize.Op.ne]: null, },
      },
    });
    let restores = 0;
    let failures = 0;
    for (const channel of channels) {
      if (!channel.game) {
        continue;
      }

      const id = channel.game.channel;

      if (client.getChannel(id)) {
        try {
          if (channel.game) {
            let game = await Game.deserialize(channel.game, client);
            if (game) {
              client.games[id] = game;
            }
            await client.createMessage(id, 'A game has been restored in this channel.');
            restores++;
          }
        } catch (err) {
          console.error('Unable to restore game in', id, ', removing...', err.stack);
          delete client.games[id];
          channel.game = null;
          await channel.save();
          failures++;
        }
      }
    }
    console.info('Restored', restores, 'games,', failures, 'failed to restore.');
  } catch (err) {
    console.error('Issue restoring old games:', err);
  }
  ready = true;
});

client.on('error', err => {
  console.error(err);
});

client.on('warn', msg => {
  console.error(msg);
});

client.on('connect', id => {
  console.shard('Shard', id, 'has connected');
});

client.on('shardPreReady', id => {
  console.shard('Shard', id, 'is pre-ready');
});
client.on('shardReady', id => {
  console.shard('Shard', id, 'is ready');
  client.sender.send('shardReady', id);
});
client.on('shardResume', id => {
  console.shard('Shard', id, 'resumed');
});
client.on('shardDisconnect', (err, id) => {
  console.warn('Shard', id, 'disconnected', err || '');
});

const channelQueue = {};

function queueCommand(msg) {
  if (!channelQueue[msg.channel.id]) {
    channelQueue[msg.channel.id] = { q: [], e: false, };
  }
  channelQueue[msg.channel.id].q.push(msg);
}

async function executeQueue(msg) {
  if (!channelQueue[msg.channel.id].e) {
    channelQueue[msg.channel.id].e = true;
    let m;
    while (m = channelQueue[msg.channel.id].q.shift()) {
      try {
        await executeCommand(m);
      } catch (err) {
        console.error(err);
      }
    }
    channelQueue[msg.channel.id].e = false;
  }
}

async function executeCommand(msg) {
  if (msg.content.toLowerCase().startsWith(prefix)) {
    let segments = msg.content.substring(prefix.length).trim().split('&&');
    if (segments.length > 2) {
      return await msg.channel.createMessage('Sorry, you can only execute up to **two** commands with a single message!');
    }
    if (segments[1] && segments[1].trim().toLowerCase().startsWith(prefix)) {
      segments[1] = segments[1].trim().substring(prefix.length);
    }
    for (const text of segments) {
      let words = text.trim().split(/\s+/);
      let name = words.shift().toLowerCase().replace(/\!+/, '!');
      if (client.getCommand(name)) {
        let res = await client.getCommand(name).execute(msg, words, text.trim().substring(name.length));
        if (res) {
          await msg.channel.createMessage(res);
        }
      }
    }
  }

  if (msg.content.match(/u+n+o+\!+$/i)) {
    let res = await client.getCommand('uno').execute(msg);
    if (res) {
      await msg.channel.createMessage(res);
    }
  }
}

client.on('messageCreate', async(msg) => {
  if (!ready) {return;}
  if (msg.author.bot) {return;}
  if (queryCache[msg.channel.id] && queryCache[msg.channel.id][msg.author.id]) {
    queryCache[msg.channel.id][msg.author.id].resolve(msg);
    return delete queryCache[msg.channel.id][msg.author.id];
  }

  queueCommand(msg);
  await executeQueue(msg);
});

client.on('interactionCreate', async(interaction) => {
  if (!ready) {return;}

  const command = client.getCommand(interaction.data.custom_id);
  if (command && command.interact) {
    const res = await command.interact(interaction);
    if (res) {
      let body = {
        flags: 64,
      };
      if (typeof res === 'object') {
        body = { ...body, ...res, };
      } else {
        body.content = res;
      }
      await interaction.createMessage(body);
    }
  }
});

client.on('guildMemberRemove', async(guild, member) => {
  const guildGames = Object.values(client.games)
    .filter(game => game.channel.guild.id === guild.id)
    .filter(game => game.players[member.id]);

  for (const game of guildGames) {
    await game.channel.createMessage(await client.gameManager.removePlayerFromGame(game, member.user));
  }
});

console.log('Connecting...');
client.connect();

process.on('message', async msg => {
  const { data, code, } = JSON.parse(msg);

  if (code.startsWith('await:'))
  {client.sender.emit(code, data);}

  switch (code) {
  case 'await': {
    const eventKey = `await:${data.key}`;
    switch (data.message) {
    case 'restart': {
      ready = false;
      for (const id of Object.keys(client.games)) {
        try {
          let game = client.games[id];
          await db.channel.upsert({
            id: game.channel.id,
            game: game.serialize(),
          });
          await client.createMessage(id, 'The bot is being restarted, so there will be a brief downtime. '
            + 'Don\'t worry though, your game has been saved!');
        } catch (err) {
          // NO-OP
        }
      }
      client.sender.send(eventKey, {});
    }
    case 'stats': {
      const memory = process.memoryUsage();

      client.sender.send(eventKey, JSON.stringify({
        rss: memory.rss / 1024 / 1024,
        guilds: client.guilds.size,
        games: Object.keys(client.games).length,
      }));
      break;
    }
    case 'games': {
      client.sender.send(eventKey, JSON.stringify(
        Object.values(client.games)
          .filter(g => g.players[data.userId])
          .map(g => ({ channelId: g.channel.id, channelName: g.channel.name, }))
      ));
      break;
    }
    case 'hand': {
      let game = client.games[data.channelId];
      let response = {
        applicable: false,
        ok: true,
        hand: [],
      };
      if (game) {
        response.applicable = true;
        let player = game.players[data.userId];
        if (player) {
          player.sortHand();
          response.hand = player.hand;
        } else {
          response.ok = false;
          response.error = 'You aren\'t part of this game.';
        }
      }
      client.sender.send(eventKey, JSON.stringify(response));
      break;
    }
    }
  }
  }
});


client.sender.send('shardReady', {});
