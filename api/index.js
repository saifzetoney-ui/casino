const https = require('https');
const urlModule = require('url');
const casinoVault = require('../casino-vault');
const db = require('../database');

const LIVE_ORIGIN = 'https://greenpump.xyz';

function send(res, status, body, type = 'application/json; charset=utf-8') {
  if (!res || res.headersSent) return;
  try {
    res.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(body);
  } catch (e) {
    console.error('[API] send error:', e.message);
  }
}

function parseJsonBody(req, callback) {
  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 1e6) {
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!raw.trim()) return callback(null, {});
    try {
      const data = JSON.parse(raw);
      callback(null, data);
    } catch (e) {
      callback(e);
    }
  });
  req.on('error', err => callback(err));
}

let cachedSolPrice = null;
let lastSolPriceFetch = 0;

function fetchSolPrice(callback) {
  const now = Date.now();
  if (cachedSolPrice && (now - lastSolPriceFetch < 2000)) {
    return callback(null, cachedSolPrice);
  }

  const req = https.get('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT', {
    headers: { 'User-Agent': 'LuckyWin/1.0', 'Accept': 'application/json' },
    timeout: 4000
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const price = Number(json.lastPrice || 0);
        if (price > 0) {
          cachedSolPrice = {
            symbol: 'SOL',
            price,
            change24h: Number(json.priceChangePercent || 0),
            high24h: Number(json.highPrice || 0),
            low24h: Number(json.lowPrice || 0),
            volume24h: Number(json.volume || 0),
            updatedAt: Date.now()
          };
          lastSolPriceFetch = now;
          return callback(null, cachedSolPrice);
        }
      } catch (e) {}
      callback(new Error('Failed to parse price data'));
    });
  });

  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Price fetch timed out'));
  });
}

function fetchSolKlines(callback) {
  const req = https.get('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=40', {
    headers: { 'User-Agent': 'LuckyWin/1.0', 'Accept': 'application/json' },
    timeout: 4000
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (Array.isArray(json)) {
          const klines = json.map(k => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
          return callback(null, { symbol: 'SOL', interval: '1m', klines });
        }
      } catch (e) {}
      callback(new Error('Failed to parse klines data'));
    });
  });

  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Klines fetch timed out'));
  });
}

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  function extractToken(req, parsedUrl) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return parsedUrl.searchParams.get('token') || '';
  }

  // --- AUTH & DATABASE PERSISTENCE ENDPOINTS ---
  if (pathname === '/api/auth/register') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const result = db.registerUser(body);
        send(res, 200, JSON.stringify(result));
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/login') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const result = db.loginUser(body);
        send(res, 200, JSON.stringify(result));
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/google') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, async (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
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

        const result = db.googleAuthUser({ email, name, picture });
        send(res, 200, JSON.stringify(result));
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/me') {
    const token = extractToken(req, parsedUrl);
    const user = db.getUserByToken(token);
    if (!user) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized or session expired' }));
      return;
    }
    send(res, 200, JSON.stringify({ user }));
    return;
  }

  if (pathname === '/api/auth/logout') {
    parseJsonBody(req, (err, body) => {
      const token = (body && body.token) || extractToken(req, parsedUrl);
      db.destroySession(token);
      send(res, 200, JSON.stringify({ ok: true }));
    });
    return;
  }

  if (pathname === '/api/user/sync') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const token = body.token || extractToken(req, parsedUrl);
      const user = db.getRawUserByToken(token);
      if (!user) {
        send(res, 401, JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const updated = db.updateUser(user.id, body);
      send(res, 200, JSON.stringify({ ok: true, user: updated }));
    });
    return;
  }

  if (pathname === '/api/user/bet') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const token = body.token || extractToken(req, parsedUrl);
      const user = db.getRawUserByToken(token);
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
      const bet = db.recordBet(betData);
      const freshUser = user ? db.getUserByToken(token) : null;
      send(res, 200, JSON.stringify({ ok: true, bet, user: freshUser }));
    });
    return;
  }

  if (pathname === '/api/user/bets') {
    const token = extractToken(req, parsedUrl);
    const user = db.getUserByToken(token);
    if (!user) {
      send(res, 401, JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const limit = parseInt(parsedUrl.searchParams.get('limit') || '50', 10);
    const userBets = db.getUserBets(user.id, limit);
    send(res, 200, JSON.stringify({ bets: userBets }));
    return;
  }

  if (pathname === '/api/casino-vault') {
    casinoVault.getVaultStats((err, stats) => {
      if (err) {
        send(res, 500, JSON.stringify({ error: err.message }));
      } else {
        send(res, 200, JSON.stringify(stats));
      }
    });
    return;
  }

  if (pathname === '/api/vault-ledger') {
    const ledger = casinoVault.getLedger();
    send(res, 200, JSON.stringify({ transactions: ledger.slice(0, 50) }));
    return;
  }

  if (pathname === '/api/user-balance') {
    if (req.method === 'GET') {
      const address = parsedUrl.searchParams.get('address');
      const balance = casinoVault.getUserBalance(address);
      send(res, 200, JSON.stringify({ address, balance }));
      return;
    }
    if (req.method === 'POST') {
      parseJsonBody(req, (err, body) => {
        if (err || !body || !body.address) {
          send(res, 400, JSON.stringify({ error: 'Address and delta required' }));
          return;
        }
        const delta = Number(body.delta) || 0;
        const newBal = casinoVault.updateUserBalance(body.address, delta, body.reason);
        send(res, 200, JSON.stringify({ address: body.address, balance: newBal }));
      });
      return;
    }
  }

  if (pathname === '/api/check-deposits') {
    const address = parsedUrl.searchParams.get('address') || 'any';
    casinoVault.scanVaultForNewDeposits(address, (err, result) => {
      if (err) {
        send(res, 500, JSON.stringify({ error: err.message }));
      } else {
        send(res, 200, JSON.stringify(result || { newDeposits: [] }));
      }
    });
    return;
  }

  if (pathname === '/api/verify-deposit') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      casinoVault.verifyDeposit(body, (err, result) => {
        if (err) {
          send(res, 400, JSON.stringify({ error: err.message }));
        } else {
          send(res, 200, JSON.stringify(result));
        }
      });
    });
    return;
  }

  if (pathname === '/api/request-withdrawal') {
    if (req.method !== 'POST') {
      send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    parseJsonBody(req, (err, body) => {
      if (err || !body) {
        send(res, 400, JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      casinoVault.requestWithdrawal(body, (err, result) => {
        if (err) {
          send(res, 400, JSON.stringify({ error: err.message }));
        } else {
          send(res, 200, JSON.stringify(result));
        }
      });
    });
    return;
  }

  if (pathname === '/api/sol-price') {
    fetchSolPrice((err, data) => {
      if (err) {
        send(res, 502, JSON.stringify({ error: err.message }));
      } else {
        send(res, 200, JSON.stringify(data));
      }
    });
    return;
  }

  if (pathname === '/api/sol-klines') {
    fetchSolKlines((err, data) => {
      if (err) {
        send(res, 502, JSON.stringify({ error: err.message }));
      } else {
        send(res, 200, JSON.stringify(data));
      }
    });
    return;
  }

  send(res, 404, JSON.stringify({ error: 'Not found' }));
};
