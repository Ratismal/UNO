const EventEmitter = require('eventemitter3');
const Catflake = require('catflake');

const clusterId = Number(process.env.CLUSTER_ID);

const catflake = new Catflake({
  processBits: 0, workerBits: 8, incrementBits: 14, workerId: clusterId,
});


module.exports = class Sender extends EventEmitter {
  constructor(client, proc) {
    super();
    this.client = client;
    this.process = proc || process;
  }

  send(code, data) {
    if (data === undefined) {
      data = code;
      code = 'generic';
    }
    if (!(data instanceof Object)) {
      data = {
        message: data,
        shard: clusterId,
      };
    }
    const message = {
      code, data,
    };

    return new Promise((res, rej) => {
      this.process.send(JSON.stringify(message), err => {
        if (!err) {res();}
        else {
          console.error(err);
          if (!this.process.connected && this.process.kill) {this.process.kill();}
          rej(err);
        }
      });
    });
  }

  awaitMessage(data) {
    if (!(data instanceof Object)) {
      data = {
        message: data,
      };
    }
    return new Promise((res, rej) => {
      data.key = catflake.generate();
      let event = `await:${data.key}`;
      this.send('await', data);
      let timer = setTimeout(() => {
        this.process.removeAllListeners(event);
        rej(new Error('Rejected message after 60 seconds.'));
      }, 60000);
      this.once(event, data => {
        clearTimeout(timer);
        try {
          data.message = JSON.parse(data.message);
        } catch (err) {
          // NO-OP
        }
        res(data);
      });
    });
  }
};
