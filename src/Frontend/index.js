const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const Static = require('koa-static');
const websocketify = require('koa-websocket');
const Security = require('./Security');
const snekfetch = require('snekfetch');

const BASE_ENDPOINT = 'https://discordapp.com/api/v6/';
const TOKEN_ENDPOINT = 'https://discordapp.com/api/oauth2/token';
const USER_ENDPOINT = BASE_ENDPOINT + 'users/@me';

class WsMethods {
    constructor(client, frontend) {
        this.client = client;
        this.frontend = frontend;
    }

    async send(ctx, data) {
        ctx.websocket.send(JSON.stringify(data));
    }

    async method_ping(ctx, data) {
        await this.send(ctx, { code: 'pong' });
    }

    async method_hello(ctx, data) {
        await this.send(ctx, { code: 'message', message: 'ur cute, but auth pls' });
    }

    async method_authorize(ctx, data) {
        let id = Security.validateToken(data.token);
        if (id) {
            ctx.userId = id.id;
            this.send(ctx, {
                code: 'authorize',
                message: 'thank you ^w^'
            });
        } else {
            this.send(ctx, {
                code: 'reauth',
                message: 'wasnt valid sorry :('
            });
            ctx.websocket.close();
        }
    }

    async method_requestGames(ctx, data) {
        let rawGames = await this.client.spawner.awaitBroadcast({
            message: 'games',
            userId: ctx.userId
        });
        let games = [];
        for (const response of rawGames) {
            for (const game of response.message) {
                games.push(game);
            }
        }
        this.send(ctx, {
            code: 'games',
            games: games
        });
    }

    async method_channel(ctx, data) {
        ctx.channelId = data.channel;
        let hand = await this.client.spawner.awaitBroadcastConditional({
            message: 'hand',
            userId: ctx.userId,
            channelId: data.channel
        }, response => response && response.message && response.message.applicable);
        if (hand) {
            if (!hand.ok) {
                this.send(ctx, { code: 'error', message: hand.error });
            } else {
                await this.send(ctx, {
                    code: 'cards',
                    hand: hand.hand,
                    userId: ctx.userId,
                    channelId: ctx.channelId
                });
            }
        } else {
            this.send(ctx, {
                code: 'error', message: 'No game has been started.'
            });
        }
    }
}

module.exports = class Frontend {
    constructor(client) {
        this.client = client;
        this.app = websocketify(new Koa());
        this.router = new Router();
        this.static = new Static(path.join(__dirname, 'public'));
        this.wsMethods = new WsMethods(client, this);

        this.mainPage = fs.readFileSync(path.join(__dirname, 'pages', 'index.html'));
        this.gamePage = fs.readFileSync(path.join(__dirname, 'pages', 'game.html'));

        this.router.get('/', async (ctx, next) => {
            ctx.body = this.mainPage;
            ctx.status = 200;
            ctx.set('content-type', 'text/html');
        });

        this.router.get('/game/:id', async (ctx, next) => {
            let id = ctx.params.id;
            ctx.body = this.gamePage;
            ctx.status = 200;
            ctx.set('content-type', 'text/html');

        });

        this.router.get('/login', async (ctx, next) => {
            ctx.redirect("https://discordapp.com/oauth2/authorize" +
                "?client_id=" + this.client.config.oauth.id +
                "&scope=identify" +
                "&response_type=code" +
                "&redirect_uri=" + this.client.config.oauth.redirect);
        });

        this.router.get('/callback', async (ctx, next) => {
            try {
                console.log(ctx.query.code);
                let res = await snekfetch.post(TOKEN_ENDPOINT).set({
                    'Content-Type': 'application/x-www-form-urlencoded'
                }).send({
                    client_id: this.client.config.oauth.id,
                    client_secret: this.client.config.oauth.secret,
                    grant_type: 'authorization_code',
                    code: ctx.query.code,
                    redirect_uri: this.client.config.oauth.redirect,
                    scope: 'identify'
                });
                let access_token = res.body.access_token;

                res = await snekfetch.get(USER_ENDPOINT).set('Authorization', 'Bearer ' + access_token);
                let token = Security.generateToken(res.body.id);

                ctx.status = 200;
                ctx.body = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <title>title</title>
                  </head>
                  <body>
                  <script>
                    localStorage.token = '${token}';
                    window.location.replace('/');
                  </script>
                  </body>
                </html>
                `;
            } catch (err) {
                console.error(err);
                ctx.status = 400;
                ctx.body = err.message;
            }
        });

        this.app
            .use(this.static)
            .use(this.router.routes())
            .use(this.router.allowedMethods());

        this.wsRouter = new Router();

        this.conns = [];

        this.wsRouter.get('/uno', async (ctx, next) => {
            this.conns.push(ctx);
            ctx.userId = null;
            ctx.channelId = null;
            ctx.websocket.send(JSON.stringify({ code: 'hello' }));
            ctx.websocket.on('message', async message => await this.handleMessage(ctx, message));

            ctx.websocket.on('close', async () => {
                console.log('Websocket closed.');
                this.conns.splice(this.conns.indexOf(ctx), 1);
            })
        })

        this.app.ws
            .use(this.wsRouter.routes())
            .use(this.wsRouter.allowedMethods());

        this.app.listen(8108);
        console.info('Website listening on port 8108');
    }

    async emitToWebsocket(code, data) {
        let datum = { code, ...data };
        let connections = this.conns;

        if (datum.userId)
            connections = connections.filter(ctx => ctx.userId === datum.userId);
        if (datum.channelId)
            connections = connections.filter(ctx => ctx.channelId === datum.channelId);

        connections.forEach(ctx => this.wsMethods.send(ctx, datum));
    }

    async handleMessage(ctx, message) {
        let data = message;
        try {
            data = JSON.parse(message);
        } catch { }
        if (data && data.code && this.wsMethods['method_' + data.code]) {
            await this.wsMethods['method_' + data.code](ctx, data);
        }
    }
}