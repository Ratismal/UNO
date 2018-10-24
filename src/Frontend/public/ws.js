class UWebSocket {
    constructor(methods = {}) {
        this.loc = window.location;

        this.path = `${this.loc.protocol === 'http:' ? 'ws://' : 'wss://'}${this.loc.host}/uno`;
        this.ws = null;
        this.started = false;
        this.retry = -1;
        this.reconnect = true;

        this.interval = null;
        this.errEl = document.getElementById('err-message');

        this.staticMethods = {
            hello(data) {
                this.send('authorize', { token: localStorage.token });
            },
            message(data) {
                console.log('Received Message: %s', data.message);
            },
            error(data) {
                if (this.errEl)
                    this.errEl.innerText = data.message;
            },
        }

        this.methods = { ...methods, ...this.staticMethods };
    }

    send(code, data = {}) {
        let datum = { ...data };
        if (typeof code === 'string')
            datum = { ...datum, code };
        else
            datum = { ...datum, ...code };
        // console.log('Sending: %o', datum);
        this.ws.send(JSON.stringify(datum));
    }

    startWebsocket() {
        console.log('Opening websocket...');
        this.ws = new WebSocket(this.path);

        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
    }

    onOpen() {
        console.log('Websocket Opened!');
        this.retry = -1;

        this.interval = setInterval(() => {
            this.send('ping');
        }, 15000);
    }

    onClose() {
        clearInterval(this.interval);
        if (this.reconnect && this.retry < 4) {
            this.retry++;
            let ret = ((2 ** this.retry) * 5) * 1000;
            console.log('Websocket Closed! Retrying in %dms', ret);

            setTimeout(() => {
                this.startWebsocket();
            }, ret);
        }
    }

    onError(err) {
        console.error('Websocket Error', err);
    }

    onMessage(event) {
        let data = event.data;
        try {
            data = JSON.parse(data);
        } catch { }
        if (typeof data === 'object' && data.code && this.methods[data.code]) {
            this.methods[data.code].bind(this)(data);
        } else {
            // console.log('Received: %o', data);
        }
    }
}