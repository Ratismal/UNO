require('./logger');
const config = require('../config.json');
const Spawner = require('./Spawner');
const Frontend = require('./Frontend');
class Client {
  constructor() {
    this.config = config;
    this.spawner = new Spawner(this);
    this.frontend = new Frontend(this);

    this.spawner.spawnAll();
  }
}

/* eslint-disable-next-line */
const client = new Client();
