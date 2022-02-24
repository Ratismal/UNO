const BaseCommand = require('../BaseCommand');

module.exports = class PlayCommand extends BaseCommand {
  constructor(client) {
    super(client, 'play', {
      aliases: ['p', 'pl', 'ply', 'pla'],
    });
  }

  async execute(msg, words, drawn = false) {
    let game = this.games[msg.channel.id];
    if (game) {
      if (!game.started) {return "Sorry, but the game hasn't been started yet!";}

      if (game.player.id !== msg.author.id) {return `It's not your turn yet! It's currently ${game.player.member.user.username}'s turn.`;}

      let card = await game.player.getCard(words);
      if (card === null) {return;}
      if (!card) {return "It doesn't seem like you have that card! Try again.";}

      game.player.cardsPlayed++;

      if (!game.flipped.color || card.wild || card.id === game.flipped.id || card.color === game.flipped.color) {

        game.discard.push(card);
        game.player.hand.splice(game.player.hand.indexOf(card), 1);
        game.player.cardsChanged();

        game.log('play', msg.author.id, { card: card.toString(), remaining: game.player.hand.length, });

        let pref = '';
        if (game.player.hand.length === 0) {
          game.finished.push(game.player);
          game.player.finished = true;
          game.log('finished', msg.author.id, { rank: game.finished.length, });

          pref = `${game.player.member.user.username} has no more cards! They finished in **Rank #${game.finished.length}**! :tada:\n\n`;
          if (2 === game.queue.length) {
            game.finished.push(game.queue[1]);
            pref = game.scoreboard();
            this.client.gameManager.deleteGame(game.channel.id);
            return pref;
          }
        }

        let extra = '';
        switch (card.id) {
        case 'REVERSE':
          if (game.queue.length > 2) {
            let player = game.queue.shift();
            game.queue.reverse();
            game.queue.unshift(player);
            extra = 'Turns are now in reverse order! ';
            game.log('reverse', msg.author.id);
            break;
          } else if (game.rules.REVERSE_SKIP === true) {
            let skipped = game.queue.shift();
            game.queue.push(skipped);
            game.log('skip', msg.author.id, { target: game.queue[0].id, });
            extra = `Sorry, ${game.player.member.user.username}! Skip a turn! `;
            break;
          }
        case 'SKIP':
          let skipped = game.queue.shift();
          game.queue.push(skipped);
          game.log('skip', msg.author.id, { target: game.queue[0].id, });

          extra = `Sorry, ${game.player.member.user.username}! Skip a turn! `;
          break;
        case '+2':
          let amount = 0;
          for (let i = game.discard.length - 1; i >= 0; i--) {
            if (game.discard[i].id === '+2')
            {amount += 2;}
            else {break;}
          }
          game.log('pickup', msg.author.id, { target: game.queue[1].id, amount, });
          game.deal(game.queue[1], amount);
          extra = `${game.queue[1].member.user.username} picks up ${amount} cards! Tough break. `;
          if (game.rules.DRAW_SKIP === true) {
            extra += ' Also, skip a turn!';
            game.queue.push(game.queue.shift());
            game.log('skip', msg.author.id, { target: game.queue[0].id, });
          }
          break;
        case 'WILD':
          game.log('color_change', msg.author.id, { color: card.colorName, });
          extra = `In case you missed it, the current color is now **${card.colorName}**! `;
          break;
        case 'WILD+4': {
          game.log('color_change', msg.author.id, { color: card.colorName, });
          game.log('pickup', msg.author.id, { target: game.queue[1].id, amount: 4, });
          // let player = game.queue.shift();
          await game.deal(game.queue[1], 4);

          // game.queue.unshift(player);
          extra = `${game.queue[1].member.user.username} picks up 4! The current color is now **${card.colorName}**! `;
          if (game.rules.DRAW_SKIP === true) {
            extra += ' Also, skip a turn!';
            let skipped = game.queue.shift();
            game.queue.push(skipped);
            game.log('skip', msg.author.id, { target: game.queue[0].id, });
          }
          break;
        }
        }

        await game.next();
        return game.embed(`${pref}${drawn
          ? `${msg.author.username} has drawn and auto-played a **${game.flipped}**.`
          : `A **${game.flipped}** has been played.`} ${extra}\n\nIt is now ${game.player.member.user.username}'s turn!`);
      } else {return "Sorry, you can't play that card here!";}

    } else {return "Sorry, but a game hasn't been created yet! Do `uno join` to create one.";}
  }
};
