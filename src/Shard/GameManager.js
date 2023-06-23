module.exports = class GameManager {
  constructor(client) {
    this.client = client;

    this.games = {};

    this.saveGameInterval = setInterval(this.saveGame.bind(this), 1000 * 60);
    this.timeoutInterval = setInterval(this.timeout.bind(this), 1000 * 30);
  }

  async saveGame() {
    for (const id of Object.keys(this.games)) {
      let game = this.games[id];
      await this.client.db.channel.upsert({
        id: game.channel.id,
        game: game.serialize(),
      });
    }
  }

  async timeout() {
    for (const id of Object.keys(this.games)) {
      try {
        let game = this.games[id];
        if (!game) {
          console.info('Deleting non-existent game with id', id);
          this.deleteGame(id);
          continue;
        }
        if (!game.started && (Date.now() - game.lastChange) >= 3 * 60 * 1000) {
          await game.send('The game has been cancelled due to inactivity.');
          this.deleteGame(id);
        } else if (game.started && (Date.now() - game.lastChange) >= 5 * 60 * 1000) {
          let user = game.queue[0].member.user;
          let msg = { author: user, channel: { id, }, };
          let out = await this.client.getCommand('quit').execute(msg, []);
          if (typeof out === 'string') {
            out = out.split('\n');
            out[0] = `**${user.username}#${user.discriminator}** has been kicked from the game due to inactivity.`;
            out = out.join('\n');
          } else {
            let desc = out.embeds[0].description;
            desc = desc.split('\n');
            desc[0] = `**${user.username}#${user.discriminator}** has been kicked from the game due to inactivity.`;
            desc = desc.join('\n');
            out.embeds[0].description = desc;
          }
          if (game.queue.length === 0) {
            if (typeof out === 'string')
            {out += '\nThe game has been cancelled due to no remaining players.';}
            else {out.embeds[0].description += '\nThe game has been cancelled due to no remaining players.';}
            this.deleteGame(id);
          }
          await game.send(out);
        }
      } catch (err) {
        console.error(err);
        this.deleteGame(id);
      }
    }
  }

  async deleteGame(id) {
    delete this.games[id];
    let channel = await this.client.db.channel.findByPk(id);
    if (channel) {
      await channel.update({
        game: null,
      });
    }
  };

  async removePlayerFromGame(game, user) {
    let out = '';

    game.log('quit', user.id);

    game.dropped.push(game.players[user.id]);
    if (game.started && game.queue.length <= 2) {
      game.queue = game.queue.filter(p => p.id !== user.id);
      game.finished.push(game.queue[0]);
      out += game.scoreboard();
      this.deleteGame(game.channel.id);
      return out;
    }
    if (game.started && game.player.member.id === user.id) {
      game.next();
      out = game.embed(`${out}A **${game.flipped}** was played last. \n\nIt is now ${game.player.member.user.username}'s turn!`);
    }
    delete game.players[user.id];
    game.queue = game.queue.filter(p => p.id !== user.id);
    if (!game.started, game.queue.length === 0) {
      out = 'The game has been cancelled.';
      this.deleteGame(game.channel.id);
    }

    return out;
  }
};
