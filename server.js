const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
const LIVE_ORIGIN = 'https://greenpump.xyz';
const LIVE_PATHS = ['/api/chat', '/api/avatar'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  if (!res || res.headersSent) return;
  try {
    res.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(body);
  } catch (e) {
    console.error('[Server] send error:', e.message);
  }
}

function proxyLive(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  const target = new URL(url.pathname + url.search, LIVE_ORIGIN);
  const upstream = https.get(target, {
    headers: {
      'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
      accept: req.headers.accept || '*/*',
      'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9',
      'cache-control': 'no-cache'
    }
  }, upstreamRes => {
    const headers = {
      'Content-Type': upstreamRes.headers['content-type'] || 'application/octet-stream',
      'Cache-Control': url.pathname === '/api/chat' ? 'no-store' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    };
    if (upstreamRes.headers['retry-after']) headers['Retry-After'] = upstreamRes.headers['retry-after'];
    if (upstreamRes.headers['content-length']) headers['Content-Length'] = upstreamRes.headers['content-length'];

    res.writeHead(upstreamRes.statusCode || 502, headers);
    upstreamRes.pipe(res);
  });

  upstream.setTimeout(12000, () => {
    upstream.destroy(new Error('Live chat request timed out'));
  });

  upstream.on('error', error => {
    if (!res.headersSent) {
      send(res, 502, JSON.stringify({ error: 'Live chat unavailable', detail: error.message }), 'application/json; charset=utf-8');
    } else {
      res.destroy();
    }
  });
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  if (pathname === '/_vercel/insights/script.js') {
    send(res, 200, '/* Vercel Analytics local development stub */ window.va = window.va || function(){(window.vaq = window.vaq || []).push(arguments);};', 'text/javascript; charset=utf-8');
    return;
  }
  if (pathname.startsWith('/_vercel/insights/')) {
    send(res, 200, '{"status":"ok"}', 'application/json; charset=utf-8');
    return;
  }

  let filePath = path.resolve(ROOT, '.' + pathname);
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      const pubPath = path.resolve(ROOT, 'public', '.' + pathname);
      if (fs.existsSync(pubPath)) {
        filePath = pubPath;
      } else if (fs.existsSync(pubPath + '.html')) {
        filePath = pubPath + '.html';
      }
    }
  }
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    send(res, 403, 'Forbidden');
    return;
  }

  function streamFile(targetPath) {
    fs.stat(targetPath, (err, s) => {
      if (err || !s.isFile()) {
        send(res, 404, 'Not found');
        return;
      }
      const type = MIME[path.extname(targetPath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': s.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(targetPath);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      if (!path.extname(pathname)) {
        streamFile(path.resolve(ROOT, './index.html'));
        return;
      }
      send(res, 404, 'Not found');
      return;
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

let cachedSolPrice = null;
let lastSolPriceFetch = 0;

function once(fn) {
  let called = false;
  return function(...args) {
    if (called) return;
    called = true;
    fn.apply(this, args);
  };
}

function fetchSolPrice(rawCallback) {
  const callback = once(rawCallback);
  const now = Date.now();
  if (cachedSolPrice && (now - lastSolPriceFetch < 2000)) {
    return callback(null, cachedSolPrice);
  }

  const req = https.get('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT', {
    headers: { 'User-Agent': 'LuckyWin/1.0', 'Accept': 'application/json' },
    timeout: 4000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json && json.lastPrice) {
          cachedSolPrice = {
            price: parseFloat(json.lastPrice),
            change24h: parseFloat(json.priceChangePercent),
            high24h: parseFloat(json.highPrice),
            low24h: parseFloat(json.lowPrice),
            timestamp: now,
            source: 'binance'
          };
          lastSolPriceFetch = now;
          return callback(null, cachedSolPrice);
        }
      } catch (e) {}
      fallbackCoinbase(callback);
    });
  });

  req.on('error', () => fallbackCoinbase(callback));
  req.on('timeout', () => { req.destroy(); fallbackCoinbase(callback); });
}

function fallbackCoinbase(rawCallback) {
  const callback = once(rawCallback);
  const now = Date.now();
  const req = https.get('https://api.coinbase.com/v2/prices/SOL-USD/spot', {
    headers: { 'User-Agent': 'LuckyWin/1.0', 'Accept': 'application/json' },
    timeout: 4000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json && json.data && json.data.amount) {
          cachedSolPrice = {
            price: parseFloat(json.data.amount),
            change24h: 0,
            high24h: parseFloat(json.data.amount),
            low24h: parseFloat(json.data.amount),
            timestamp: now,
            source: 'coinbase'
          };
          lastSolPriceFetch = now;
          return callback(null, cachedSolPrice);
        }
      } catch (e) {}
      if (cachedSolPrice) return callback(null, cachedSolPrice);
      callback(new Error('Failed to fetch SOL price'));
    });
  });

  req.on('error', (err) => {
    if (cachedSolPrice) return callback(null, cachedSolPrice);
    callback(err);
  });
  req.on('timeout', () => {
    req.destroy();
    if (cachedSolPrice) return callback(null, cachedSolPrice);
    callback(new Error('Coinbase timeout'));
  });
}

let cachedKlines = null;
let lastKlinesFetch = 0;

function fetchSolKlines(rawCallback) {
  const callback = once(rawCallback);
  const now = Date.now();
  if (cachedKlines && (now - lastKlinesFetch < 10000)) {
    return callback(null, cachedKlines);
  }

  const req = https.get('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=40', {
    headers: { 'User-Agent': 'LuckyWin/1.0', 'Accept': 'application/json' },
    timeout: 5000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (Array.isArray(json) && json.length > 0) {
          const closes = json.map(k => parseFloat(k[4]));
          const candles = json.map(k => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4])
          }));
          cachedKlines = { closes, candles, timestamp: now };
          lastKlinesFetch = now;
          return callback(null, cachedKlines);
        }
      } catch (e) {}
      if (cachedKlines) return callback(null, cachedKlines);
      callback(new Error('Failed to fetch klines'));
    });
  });

  req.on('error', (err) => {
    if (cachedKlines) return callback(null, cachedKlines);
    callback(err);
  });
  req.on('timeout', () => {
    req.destroy();
    if (cachedKlines) return callback(null, cachedKlines);
    callback(new Error('Klines timeout'));
  });
}

const casinoVault = require('./casino-vault');
const db = require('./database');

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) {
      req.destroy();
      callback(new Error('Payload too large'));
    }
  });
  req.on('end', () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (e) {
      callback(new Error('Invalid JSON'));
    }
  });
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  function extractToken(req, parsedUrl) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return parsedUrl.searchParams.get('token') || '';
  }

  function extractAdminToken(req, parsedUrl) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    const customHeader = req.headers['x-admin-token'];
    if (customHeader) return String(customHeader).trim();
    return parsedUrl.searchParams.get('adminToken') || '';
  }

  // --- AUTH & DATABASE PERSISTENCE ENDPOINTS ---
  if (url.pathname === '/api/db-status') {
    try {
      const status = await db.getDbStatus();
      send(res, 200, JSON.stringify(status), 'application/json; charset=utf-8');
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (url.pathname === '/api/auth/register') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const result = await db.registerUser(body);
        send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/auth/login') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const result = await db.loginUser(body);
        send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/auth/google') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        let email = body.email;
        let name = body.name;
        let picture = body.picture;

        // If Google OAuth access_token is provided, verify with Google UserInfo endpoint
        if (body.access_token) {
          const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${body.access_token}` }
          });
          if (!gRes.ok) {
            const errTxt = await gRes.text().catch(() => '');
            throw new Error('Google token verification failed: ' + (errTxt || gRes.statusText));
          }
          const gData = await gRes.json();
          if (!gData.email || (gData.email_verified !== true && gData.email_verified !== 'true')) {
            throw new Error('Google account email is not verified');
          }
          email = gData.email;
          name = gData.name || gData.given_name;
          picture = gData.picture;
        } else if (body.credential) {
          // If Google ID token is provided (GIS One Tap / credential response)
          const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`);
          if (!gRes.ok) {
            const errTxt = await gRes.text().catch(() => '');
            throw new Error('Google ID token verification failed: ' + (errTxt || gRes.statusText));
          }
          const gData = await gRes.json();
          if (!gData.email || (gData.email_verified !== true && gData.email_verified !== 'true')) {
            throw new Error('Google account email is not verified');
          }
          email = gData.email;
          name = gData.name || gData.given_name;
          picture = gData.picture;
        } else if (!email) {
          throw new Error('Missing Google authentication token or credential');
        }

        const result = await db.googleAuthUser({ email, name, picture });
        send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/auth/me') {
    const token = extractToken(req, url);
    try {
      const user = await db.getUserByToken(token);
      if (!user) {
        send(res, 401, JSON.stringify({ error: 'Unauthorized or session expired' }), 'application/json; charset=utf-8');
        return;
      }
      send(res, 200, JSON.stringify({ user }), 'application/json; charset=utf-8');
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (url.pathname === '/api/auth/logout') {
    parseJsonBody(req, async (err, body) => {
      const token = (body && body.token) || extractToken(req, url);
      try {
        await db.destroySession(token);
        send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/user/sync') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      const token = body.token || extractToken(req, url);
      try {
        const user = await db.getRawUserByToken(token);
        if (!user) {
          send(res, 401, JSON.stringify({ error: 'Unauthorized' }), 'application/json; charset=utf-8');
          return;
        }
        const updated = await db.updateUser(user.id, body);
        send(res, 200, JSON.stringify({ ok: true, user: updated }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/user/bet') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      const token = body.token || extractToken(req, url);
      try {
        const user = await db.getRawUserByToken(token);
        const betData = {
          userId: user ? user.id : (body.userId || 'guest'),
          username: user ? user.username : (body.username || 'Player'),
          game: body.game,
          betAmount: body.betAmount,
          multiplier: body.multiplier,
          payout: body.payout,
          profit: body.profit,
          won: body.won
        };
        const bet = await db.recordBet(betData);
        const freshUser = user ? await db.getUserByToken(token) : null;
        send(res, 200, JSON.stringify({ ok: true, bet, user: freshUser }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/user/bets') {
    const token = extractToken(req, url);
    try {
      const user = await db.getUserByToken(token);
      if (!user) {
        send(res, 401, JSON.stringify({ error: 'Unauthorized' }), 'application/json; charset=utf-8');
        return;
      }
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const userBets = await db.getUserBets(user.id, limit);
      send(res, 200, JSON.stringify({ bets: userBets }), 'application/json; charset=utf-8');
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  // --- ADMIN PANEL SECURE API ENDPOINTS ---
  if (url.pathname === '/api/admin/auth') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const result = await db.verifyAdminAuth(body);
        send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 401, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/admin/stats') {
    const adminToken = extractAdminToken(req, url);
    const admin = db.verifyAdminToken(adminToken);
    if (!admin) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized: Valid admin credentials required' }), 'application/json; charset=utf-8');
      return;
    }
    try {
      const stats = await db.adminGetPlatformStats();
      casinoVault.getVaultStats((err, vaultStats) => {
        stats.vaultStats = vaultStats || {};
        send(res, 200, JSON.stringify({ ok: true, stats, admin }), 'application/json; charset=utf-8');
      });
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (url.pathname === '/api/admin/users') {
    const adminToken = extractAdminToken(req, url);
    const admin = db.verifyAdminToken(adminToken);
    if (!admin) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized: Valid admin credentials required' }), 'application/json; charset=utf-8');
      return;
    }
    try {
      const search = url.searchParams.get('search') || '';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const usersList = await db.adminGetUsers({ search, limit, offset });
      send(res, 200, JSON.stringify({ ok: true, users: usersList }), 'application/json; charset=utf-8');
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (url.pathname === '/api/admin/user/update') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    const adminToken = extractAdminToken(req, url);
    const admin = db.verifyAdminToken(adminToken);
    if (!admin) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized: Valid admin credentials required' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body || !body.userId) {
        send(res, 400, JSON.stringify({ error: 'User ID and updates required' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const updated = await db.adminUpdateUser(body.userId, body);
        send(res, 200, JSON.stringify({ ok: true, user: updated }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/admin/user/create') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    const adminToken = extractAdminToken(req, url);
    const admin = db.verifyAdminToken(adminToken);
    if (!admin) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized: Valid admin credentials required' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const newUser = await db.adminCreateUser(body);
        send(res, 200, JSON.stringify({ ok: true, user: newUser }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/user/sync-profile') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        const user = await db.syncUserProfile(body);
        send(res, 200, JSON.stringify({ ok: true, user }), 'application/json; charset=utf-8');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/admin/bets') {
    const adminToken = extractAdminToken(req, url);
    const admin = db.verifyAdminToken(adminToken);
    if (!admin) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized: Valid admin credentials required' }), 'application/json; charset=utf-8');
      return;
    }
    try {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const recentBets = await db.adminGetRecentBets(limit);
      send(res, 200, JSON.stringify({ ok: true, bets: recentBets }), 'application/json; charset=utf-8');
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }), 'application/json; charset=utf-8');
    }
    return;
  }

  if (url.pathname === '/api/casino-vault') {
    casinoVault.getVaultStats((err, stats) => {
      if (err) {
        send(res, 500, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
      } else {
        send(res, 200, JSON.stringify(stats), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/vault-ledger') {
    const ledger = casinoVault.getLedger();
    send(res, 200, JSON.stringify({ transactions: ledger.slice(0, 50) }), 'application/json; charset=utf-8');
    return;
  }

  if (url.pathname === '/api/user-balance') {
    if (req.method === 'GET') {
      const address = url.searchParams.get('address');
      const balance = casinoVault.getUserBalance(address);
      send(res, 200, JSON.stringify({ address, balance }), 'application/json; charset=utf-8');
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req, (err, body) => {
        if (err || !body || !body.address) {
          send(res, 400, JSON.stringify({ error: 'Address and delta required' }), 'application/json; charset=utf-8');
          return;
        }
        const delta = Number(body.delta) || 0;
        const newBal = casinoVault.updateUserBalance(body.address, delta, body.reason);
        send(res, 200, JSON.stringify({ address: body.address, balance: newBal }), 'application/json; charset=utf-8');
      });
      return;
    }
  }

  if (url.pathname === '/api/check-deposits') {
    const address = url.searchParams.get('address') || 'any';
    casinoVault.scanVaultForNewDeposits(address, (err, result) => {
      if (err) {
        send(res, 500, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
      } else {
        send(res, 200, JSON.stringify(result || { newDeposits: [] }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/verify-deposit') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      casinoVault.verifyDeposit(body, (err, result) => {
        if (err) {
          send(res, 400, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
        } else {
          send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
        }
      });
    });
    return;
  }

  if (url.pathname === '/api/request-withdrawal') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }), 'application/json; charset=utf-8');
        return;
      }
      casinoVault.requestWithdrawal(body, (err, result) => {
        if (err) {
          send(res, 400, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
        } else {
          send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
        }
      });
    });
    return;
  }

  if (url.pathname === '/api/sol-price') {
    fetchSolPrice((err, data) => {
      if (err) {
        send(res, 502, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
      } else {
        send(res, 200, JSON.stringify(data), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (url.pathname === '/api/sol-klines') {
    fetchSolKlines((err, data) => {
      if (err) {
        send(res, 502, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
      } else {
        send(res, 200, JSON.stringify(data), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  if (LIVE_PATHS.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) {
    proxyLive(req, res, url);
    return;
  }

  serveStatic(req, res, url);
}

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`GREENPUMP running at http://localhost:${PORT}`);
    console.log(`Live chat mirror: ${LIVE_ORIGIN}/api/chat`);
  });
}

module.exports = requestHandler;

