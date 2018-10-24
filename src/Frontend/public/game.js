(function () {
  if (!localStorage.token) {
    window.location.replace("/login");
  }

  let pathMatch = window.location.pathname.match(/^\/game\/(\d+)\/?$/i);
  let channelEl = document.getElementById('channel-message');

  let channel;
  if (pathMatch) {
    channel = pathMatch[1];
  } else {
    let el = document.getElementById('err-message');
    el.innerText = 'Invalid channel!';
  }

  const cardWrapper = document.getElementById('card-wrapper');

  function getUrl(card) {
    return `https://raw.githubusercontent.com/Ratismal/UNO/master/cards/${card.color || ''}${card.id}.png`;
  }

  const errEl = document.getElementById('err-message');

  const methods = {
    authorize(data) {
      this.send('channel', { channel: channel });
      this.send('requestGames', {});
    },
    games(data) {
      let game = data.games.find(g => g.channelId === channel);
      channelEl.innerText = `You are currently in the channel #${game.channelName} (${channel})`
    },
    cards(data) {
      console.log(data);
      cardWrapper.innerHTML = '';

      for (const card of data.hand) {
        let url = getUrl(card);
        let c = document.createElement('DIV');
        c.className = 'card';
        let img = document.createElement('IMG');
        img.src = url;
        c.appendChild(img);
        cardWrapper.appendChild(c);
      }

      errEl.innerText = '';
    },
    gameFinished(data) {
      if (data.chanId === channel) {
        cardWrapper.innerHTML = '';
        errEl.innerText = 'The game is over.';
      }
    },
    reauth(data) {
      window.location.replace("/login");
    },
  }

  let ws = new UWebSocket(methods);
  ws.startWebsocket();
})();
