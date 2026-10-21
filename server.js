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
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
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

  const filePath = path.resolve(ROOT, '.' + pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (LIVE_PATHS.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) {
    proxyLive(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`GREENPUMP running at http://localhost:${PORT}`);
  console.log(`Live chat mirror: ${LIVE_ORIGIN}/api/chat`);
});
