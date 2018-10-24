(function () {
  const gameWrapper = document.getElementById('game-wrapper');
  let games = [];

  function constructGame(game) {
    const el = document.createElement('div');
    el.className = 'game';

    const header = document.createElement('span');
    header.className = 'game-header';
    header.innerText = `Game in #${game.channelName}`;
    el.appendChild(header);

    const link = document.createElement('a');
    link.innerText = 'Take me there!';
    link.href = `/game/${game.channelId}`;
    link.className = 'button';
    el.appendChild(link);

    return el;
  }

  function renderGames() {
    gameWrapper.innerHTML = '';
    games.sort((a, b) => {
      return a.name.localeCompare(b);
    });

    for (const game of games) {
      if (game.chanId) game.channelId = game.chanId;
      gameWrapper.appendChild(constructGame(game));
    }
  }

  const methods = {
    gameStarted(data) {
      games = games.filter(g => g.channelId !== data.chanId);
      games.push(data);
      renderGames();
    },
    gameFinished(data) {
      games = games.filter(g => g.channelId !== data.chanId);
      console.log(data, games);
      renderGames();
    },
    games(data) {
      games = data.games;
      renderGames();
    },
    authorize(data) {
      this.send('requestGames', {});
    },
    reauth(data) {
      this.reconnect = false;
      const dynamics = document.getElementById('dynamics');
      const message = document.createElement('p');
      message.innerText = 'You aren\'t logged in. You should do that!';
      dynamics.appendChild(message);
      const link = document.createElement('a');
      link.href = '/login';
      link.className = 'button';
      link.innerText = 'Log In';
      dynamics.appendChild(link);
    },
  };

  const ws = new UWebSocket(methods);
  ws.startWebsocket();
})();