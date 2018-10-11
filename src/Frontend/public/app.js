console.log(window.location.url);

if (!localStorage.token) {
    window.location.replace("/login");
}

const loc = window.location;

let pathMatch = loc.pathname.match(/^\/game\/(\d+)\/?$/i);
let channel;
if (pathMatch) {
    channel = pathMatch[1];
    let el = document.getElementById('channel-message');
    el.innerText = 'You are currently in channel: ' + channel;
} else {
    let el = document.getElementById('err-message');
    el.innerText = 'Invalid channel!';
}

let path = `${loc.protocol === 'http:' ? 'ws://' : 'wss://'}${loc.host}/uno`;
let ws;
let retry = -1;

function send(code, data = {}) {
    let datum = { ...data };
    if (typeof code === 'string')
        datum = { ...datum, code };
    else
        datum = { ...datum, ...code };
    console.log('Sending: %o', datum);
    ws.send(JSON.stringify(datum));
}

const cardWrapper = document.getElementById('card-wrapper');

function getUrl(card) {
    return `https://raw.githubusercontent.com/Ratismal/UNO/master/cards/${card.color || ''}${card.id}.png`;
}

const methods = {
    hello(data) {
        send('authorize', { token: localStorage.token });
    },
    message(data) {
        console.log('Received Message: %s', data.message);
    },
    authorize(data) {
        send('channel', { channel: channel });
    },
    error(data) {
        let el = document.getElementById('err-message');
        el.innerText = data.message;
    },
    cards(data) {
        console.log(data.cards);
        cardWrapper.innerHTML = '';

        for (const card of data.cards) {
            let url = getUrl(card);
            let c = document.createElement('DIV');
            c.className = 'card';
            let img = document.createElement('IMG');
            img.src = url;
            c.appendChild(img);
            cardWrapper.appendChild(c);
        }
    },
}

function startWebsocket() {
    console.log('Opening websocket...');
    ws = new WebSocket(path);

    ws.onopen = () => {
        console.log('Websocket Opened!');
        retry = -1;
    }

    ws.onclose = () => {
        if (retry < 4);
        retry++;
        let ret = ((2 ** retry) * 5) * 1000;
        console.log('Websocket Closed! Retrying in %dms', ret);

        setTimeout(() => {
            startWebsocket();
        }, ret);
    }

    ws.onerror = err => {
        console.error('Websocket Error', err);
    }

    ws.onmessage = event => {
        let data = event.data;
        try {
            data = JSON.parse(data);
        } catch { }
        if (typeof data === 'object' && data.code && methods[data.code]) {
            methods[data.code](data);
        } else {
            console.log('Received: %o', data);
        }
    }
}

if (channel) {
    startWebsocket();
}    