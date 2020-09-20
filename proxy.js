const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const { v4 } = require('uuid');
const { ResponseBuilder } = require('./utils');
const axios = require('axios').default;

const sessionFingerprint = v4();

const proxy = new Koa();
proxy.use(cors({ origin: '*' }));
proxy.use(bodyParser({ enableTypes: ['json'] }));

proxy.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    console.error(e);
    ctx.body = new ResponseBuilder({ message: '(Proxy Error) Request failed.' })
      .error()
      .build();
  }
});

proxy.use(async (ctx, next) => {
  if (ctx.method === 'GET') {
    ctx.body = new ResponseBuilder({
      sessionFingerprint: sessionFingerprint,
      isProtected: !!process.env.ACCESS_TOKEN,
    }).build();
    return;
  }

  if (!ctx.request.body.url || !ctx.request.body.method) {
    ctx.body = new ResponseBuilder({
      message: '(Proxy Error) Invalid request.',
    })
      .error()
      .build();
    return;
  }

  if (
    process.env.ACCESS_TOKEN &&
    ctx.request.body.access_token != process.env.ACCESS_TOKEN
  ) {
    ctx.body = new ResponseBuilder({
      message:
        '(Proxy Error) Unauthorized request; you may need to set your access token in Settings.',
    })
      .error()
      .build();
    return;
  }

  await next();
});

proxy.use(async (ctx) => {
  const request = ctx.request.body;

  const options = {
    url: request.url,
    method: request.method,
    headers: Object.assign(request.headers || {}, {
      'User-Agent': 'ProxywomanLambda/1.0',
    }),
    data: request.body || {},
  };

  if (request.auth && request.auth.username && request.auth.password) {
    options.auth = {
      username: request.auth.username,
      password: request.auth.password,
    };
  }

  const response = await axios(options);

  ctx.body = {
    success: true,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: request.wantsBinary
      ? Buffer.from(JSON.stringify(response.data)).toString('base64')
      : response.data,
    isBinary: request.wantsBinary,
  };
});

module.exports = proxy;
