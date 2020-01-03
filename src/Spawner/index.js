const Shard = require('./Shard');
const EventEmitter = require('eventemitter3');
const moment = require('moment');
const config = require('../../config.json');

module.exports = class Spawner extends EventEmitter {
  constructor(client, options = {}) {
    super();
    this.client = client;

    this.max = config.shards.max;
    this.shardsPerCluster = config.shards.perCluster;
    this.clusterCount = Math.ceil(this.max / this.shardsPerCluster);
    console.info('There will be', this.clusterCount, 'clusters.');

    this.file = options.file || 'src/Shard/index.js';
    this.respawn = options.respawn !== undefined ? options.respawn : true;
    this.shards = new Map();
    this.guildShardMap = {};

    this.shardsSpawned = null;

    process.on('exit', code => {
      this.killAll();
    });

    this.shardCache = {};
  }

  spawn(id, set = true, file) {
    return new Promise(res => {
      const shard = new Shard(id, this, file);
      if (set) {
        if (this.shards.get(id) !== undefined) {
          this.shards.get(id).kill();
          this.shards.delete(id);
        }
        this.shards.set(id, shard);
      }
      shard.once('ready', () => {
        res(shard);
      });
    });
  }

  async spawnAll() {
    let spawned = [];
    for (let i = 0; i < this.clusterCount; i++) {
      spawned.push(await this.spawn(i));
    }
    return spawned;
  }

  respawnAll() {
    this.shardsSpawned = 0;
    return Promise.all(Array.from(this.shards.values())
      .filter(s => !isNaN(parseInt(s.id)))
      .map(s => this.respawnShard(s.id)));
  }

  respawnShard(id, dirty = false) {
    return new Promise(async (res, rej) => {
      let shard = await this.spawn(id, false);

      shard.on('shardReady', async (data) => {
        if (this.shards.get(id) !== undefined) {
          let oldShard = this.shards.get(id);
          oldShard.send('killShard', { id: data });
        }
      });

      shard.on('ready', async () => {
        if (this.shards.get(id)) {
          let oldShard = this.shards.get(id);
          oldShard.kill();
          this.shards.delete(id);
        }
        this.shards.set(id, shard);
        res();
        console.info(`Cluster ${id} has been respawned.`);
      });
    });
  }

  async broadcast(code, data) {
    for (cosnt[_, shard] of this.shards) {
      if (shard.file === this.file) {
        try {
          await shard.send(code, data);
        } catch (err) {
          // console.error(err);
        }
      }
    }
  }

  async awaitBroadcast(data) {
    let results = [];
    for (const [_, shard] of this.shards) {
      if (shard.file === this.file) {
        try {
          results.push(await shard.awaitMessage(data));
        } catch (err) {
          results.push(err);
        }
      }
    }
    return results;
  }

  async awaitBroadcastConditional(data, condition) {
    for (const [_, shard] of this.shards) {
      if (shard.file === this.file) {
        try {
          let result = await shard.awaitMessage(data);
          if (condition(result)) return result;
        } catch (err) {
        }
      }
    }
    return null;
  }

  async handleMessage(shard, code, data) {
    switch (code) {
      case 'await': {
        const eventKey = `await:${data.key}`;
        switch (data.message) {
          case 'eval': {
            let res;
            try {
              res = await eval(data.code)();
            } catch (err) {
              res = err.stack;
            }
            await shard.send(eventKey, { res });
            break;
          }
          case 'requestStats': {
            let allStats = await this.awaitBroadcast('stats');
            let stats = {
              rss: 0,
              guilds: 0,
              games: 0,
              clusters: this.shards.size
            };
            for (const stat of allStats) {
              stats.rss += stat.message.rss;
              stats.guilds += stat.message.guilds;
              stats.games += stat.message.games;
            }
            await shard.send(eventKey, { stats });
            break;
          }
        }
        break;
      }
      case 'ready': {
        for (const guild in this.guildShardMap)
          if (this.guildShardMap[guild] === shard.id) delete this.guildShardMap[guild];
        for (const guild of data)
          this.guildShardMap[guild] = shard.id;
        shard.emit('ready');
        break;
      }
      case 'shardReady': {
        shard.emit('shardReady', shard.id);
        break;
      }
      case 'emitToWebsocket': {
        this.client.frontend.emitToWebsocket(data.code, data.data);
        break;
      }
      case 'restart': {
        if (data.kill) {
          await this.killAll();
          process.exit();
        } else {
          for (const shard of this.shards.values()) {
            await this.respawnShard(shard.id);
          }
        }
        break;
      }
      case 'respawn': {
        await this.respawnShard(parseInt(data.shard));
        break;
      }
    }
  }

  handleDeath(shard, code) {
    // if (shard.respawn) this.respawnShard(shard.id);
  }

  killAll(code) {
    this.respawn = false;

    this.shards.forEach(s => s.kill());
    console.info('All shards have been killed.');
  }
}