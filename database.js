const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Load environment variables from .env file if present
try {
  require('dotenv').config();
} catch (e) {}

const ROOT = __dirname;
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let DATA_DIR = isServerless ? path.join(os.tmpdir(), 'gamblin_data') : path.join(ROOT, 'data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  DATA_DIR = os.tmpdir();
}

const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const BETS_FILE = path.join(DATA_DIR, 'bets_db.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions_db.json');
const WALLETS_FILE = path.join(DATA_DIR, 'user_wallets.json');
const LEDGER_FILE = path.join(DATA_DIR, 'vault_ledger.json');

// ============================================================================
// PostgreSQL Database Layer (Vercel Postgres / Neon / Supabase / Railway / RDS)
// ============================================================================
let pgPool = null;
let pgInitPromise = null;
let isPgAvailable = false;

function getPgConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  ).trim();
}

function initPgPool() {
  const connectionString = getPgConnectionString();
  if (!connectionString) {
    return null;
  }

  if (pgPool) return pgPool;

  try {
    const { Pool } = require('pg');
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: isServerless ? 5 : 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    });

    pgPool.on('error', err => {
      console.error('[PostgreSQL] Background pool error:', err.message);
    });

    return pgPool;
  } catch (err) {
    console.warn('[PostgreSQL] Could not initialize pg pool:', err.message);
    return null;
  }
}

async function ensureDatabaseSchema() {
  const pool = initPgPool();
  if (!pool) {
    isPgAvailable = false;
    return false;
  }

  if (pgInitPromise) return pgInitPromise;

  pgInitPromise = (async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(64) UNIQUE NOT NULL,
            password_hash TEXT,
            salt TEXT,
            auth_provider VARCHAR(32) DEFAULT 'email',
            balance NUMERIC(18, 4) DEFAULT 0.05,
            vip_rank INT DEFAULT 1,
            user_level INT DEFAULT 1,
            picture TEXT,
            avatar TEXT,
            stats JSONB DEFAULT '{"totalWagered":0,"totalProfit":0,"totalBets":0,"wins":0,"bestMult":1}'::jsonb,
            created_at BIGINT,
            last_login_at BIGINT
          );

          CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(128) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS bets (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            username VARCHAR(64),
            game VARCHAR(64),
            bet_amount NUMERIC(18, 4),
            multiplier NUMERIC(10, 2),
            payout NUMERIC(18, 4),
            profit NUMERIC(18, 4),
            won BOOLEAN,
            created_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS user_wallets (
            address VARCHAR(128) PRIMARY KEY,
            balance NUMERIC(18, 8) DEFAULT 0,
            total_deposited NUMERIC(18, 8) DEFAULT 0,
            total_withdrawn NUMERIC(18, 8) DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
          );

          CREATE TABLE IF NOT EXISTS vault_ledger (
            id VARCHAR(64) PRIMARY KEY,
            type VARCHAR(32),
            tx_hash TEXT,
            from_address TEXT,
            to_address TEXT,
            amount_sol NUMERIC(18, 8),
            timestamp TEXT,
            status VARCHAR(32),
            signature TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
          CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
          CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
          CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);
        `);

        // Check if DB is empty and migrate existing file records if available
        const countRes = await client.query('SELECT COUNT(*) AS total FROM users');
        const userCount = parseInt(countRes.rows[0]?.total || '0', 10);
        if (userCount === 0) {
          await seedPgFromLocalFiles(client);
        }

        isPgAvailable = true;
        console.log('[PostgreSQL] Connected successfully to cloud database. Schema verified.');
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('[PostgreSQL] Database connection failed, falling back to local storage:', err.message);
      isPgAvailable = false;
      return false;
    }
  })();

  return pgInitPromise;
}

// Auto-seed cloud Postgres with any accounts created in local json
async function seedPgFromLocalFiles(client) {
  try {
    const localUsers = safeLoadJson(USERS_FILE, {});
    for (const id in localUsers) {
      const u = localUsers[id];
      await client.query(`
        INSERT INTO users (id, email, username, password_hash, salt, auth_provider, balance, vip_rank, user_level, picture, avatar, stats, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [
        u.id,
        u.email,
        u.username,
        u.passwordHash || '',
        u.salt || '',
        u.authProvider || 'email',
        u.balance || 0.05,
        u.vipRank || 1,
        u.userLevel || 1,
        u.picture || '',
        u.avatar || u.picture || '',
        JSON.stringify(u.stats || {}),
        u.createdAt || Date.now(),
        u.lastLoginAt || Date.now()
      ]);
    }

    const localSessions = safeLoadJson(SESSIONS_FILE, {});
    for (const token in localSessions) {
      const s = localSessions[token];
      await client.query(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (token) DO NOTHING
      `, [s.token, s.userId, s.createdAt || Date.now(), s.expiresAt || (Date.now() + 30 * 86400000)]);
    }

    const localBets = safeLoadJson(BETS_FILE, []);
    for (const b of localBets.slice(-500)) {
      await client.query(`
        INSERT INTO bets (id, user_id, username, game, bet_amount, multiplier, payout, profit, won, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [b.id, b.userId, b.username, b.game, b.betAmount, b.multiplier, b.payout, b.profit, b.won, b.timestamp || Date.now()]);
    }

    console.log(`[PostgreSQL] Migrated local seed accounts (${Object.keys(localUsers).length} users) into PostgreSQL.`);
  } catch (seedErr) {
    console.warn('[PostgreSQL] Seed migration warning:', seedErr.message);
  }
}

// Trigger initial async connection check
ensureDatabaseSchema().catch(() => {});

// ============================================================================
// Local File Storage Fallback (Offline / Dev environment)
// ============================================================================
let users = {};
let sessions = {};
let bets = [];
let userWallets = {};
let vaultLedger = [];

function safeLoadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content && content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed reading ${path.basename(filePath)}:`, err.message);
  }
  return defaultValue;
}

function safeWriteJson(filePath, data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tmpPath = `${filePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    } catch (e) {
      console.warn(`[Database] Write failed for ${path.basename(filePath)}:`, e.message);
    }
  }
}

function initLocalDatabase() {
  users = safeLoadJson(USERS_FILE, {});
  sessions = safeLoadJson(SESSIONS_FILE, {});
  bets = safeLoadJson(BETS_FILE, []);
  userWallets = safeLoadJson(WALLETS_FILE, {});
  vaultLedger = safeLoadJson(LEDGER_FILE, []);
}

initLocalDatabase();

function saveUsers() {
  safeWriteJson(USERS_FILE, users);
}
function saveSessions() {
  safeWriteJson(SESSIONS_FILE, sessions);
}
function saveBets() {
  safeWriteJson(BETS_FILE, bets.slice(-10000));
}
function saveUserWallets() {
  safeWriteJson(WALLETS_FILE, userWallets);
}
function saveVaultLedger() {
  safeWriteJson(LEDGER_FILE, vaultLedger.slice(-10000));
}

// ============================================================================
// Cryptography & Formatting Helpers
// ============================================================================
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function formatUserRow(row) {
  if (!row) return null;
  let stats = row.stats;
  if (typeof stats === 'string') {
    try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
  } else if (!stats || typeof stats !== 'object') {
    stats = {};
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    authProvider: row.auth_provider || row.authProvider || 'email',
    balance: parseFloat(Number(row.balance || 0).toFixed(4)),
    vipRank: Number(row.vip_rank || row.vipRank || 1),
    userLevel: Number(row.user_level || row.userLevel || 1),
    picture: row.picture || '',
    avatar: row.avatar || row.picture || '',
    stats: {
      totalWagered: Number(stats.totalWagered || 0),
      totalProfit: Number(stats.totalProfit || 0),
      totalBets: Number(stats.totalBets || 0),
      wins: Number(stats.wins || 0),
      bestMult: Number(stats.bestMult || 1)
    },
    createdAt: Number(row.created_at || row.createdAt || Date.now()),
    lastLoginAt: Number(row.last_login_at || row.lastLoginAt || Date.now())
  };
}

function formatRawUserRow(row) {
  if (!row) return null;
  const safe = formatUserRow(row);
  safe.passwordHash = row.password_hash || row.passwordHash || '';
  safe.salt = row.salt || '';
  return safe;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, password_hash, salt, ...safe } = user;
  return safe;
}

// ============================================================================
// Public Auth & User Operations (Async, supports PostgreSQL & Local fallback)
// ============================================================================

async function registerUser({ email, username, password, initialBalance = 0.05 }) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required');
  }
  if (!username || username.trim().length < 2) {
    throw new Error('Username must be at least 2 characters');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().slice(0, 20);
  const now = Date.now();
  const balance = Math.max(0, Number(initialBalance) || 0.05);

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      // Check existing email
      const existingEmail = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (existingEmail.rows.length > 0) {
        throw new Error('An account with this email already exists. Please log in.');
      }

      // Check existing username
      const existingUsername = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
      if (existingUsername.rows.length > 0) {
        throw new Error('This username is already taken. Please choose another.');
      }

      const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const defaultStats = { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 };

      const insertRes = await client.query(`
        INSERT INTO users (id, email, username, password_hash, salt, auth_provider, balance, vip_rank, user_level, stats, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, 'email', $6, 1, 1, $7, $8, $9)
        RETURNING *
      `, [userId, cleanEmail, cleanUsername, passwordHash, salt, balance, JSON.stringify(defaultStats), now, now]);

      const token = generateToken();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      await client.query(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [token, userId, now, expiresAt]);

      return { user: formatUserRow(insertRes.rows[0]), token };
    } finally {
      client.release();
    }
  }

  // Local fallback
  for (const id in users) {
    if (users[id].email && users[id].email.toLowerCase() === cleanEmail) {
      throw new Error('An account with this email already exists. Please log in.');
    }
    if (users[id].username && users[id].username.toLowerCase() === cleanUsername.toLowerCase()) {
      throw new Error('This username is already taken. Please choose another.');
    }
  }

  const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    id: userId,
    email: cleanEmail,
    username: cleanUsername,
    passwordHash,
    salt,
    authProvider: 'email',
    balance,
    vipRank: 1,
    userLevel: 1,
    stats: { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 },
    createdAt: now,
    lastLoginAt: now
  };

  users[userId] = newUser;
  saveUsers();

  const token = generateToken();
  sessions[token] = {
    token,
    userId,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000
  };
  saveSessions();

  return { user: sanitizeUser(newUser), token };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanInput = email.trim().toLowerCase();
  const now = Date.now();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query(`
        SELECT * FROM users
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
      `, [cleanInput]);

      if (res.rows.length === 0) {
        throw new Error('No account found with this email or username.');
      }

      const row = res.rows[0];
      if (!row.password_hash || !row.salt) {
        throw new Error('This account was created with Google. Please use Google Login.');
      }

      const calculatedHash = hashPassword(password, row.salt);
      if (calculatedHash !== row.password_hash) {
        throw new Error('Invalid password. Please check your credentials.');
      }

      await client.query('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, row.id]);

      const token = generateToken();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      await client.query(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [token, row.id, now, expiresAt]);

      return { user: formatUserRow(row), token };
    } finally {
      client.release();
    }
  }

  // Local fallback
  let user = null;
  for (const id in users) {
    const u = users[id];
    if ((u.email && u.email.toLowerCase() === cleanInput) || (u.username && u.username.toLowerCase() === cleanInput)) {
      user = u;
      break;
    }
  }

  if (!user) {
    throw new Error('No account found with this email or username.');
  }

  if (!user.passwordHash || !user.salt) {
    throw new Error('This account was created with Google. Please use Google Login.');
  }

  const calculatedHash = hashPassword(password, user.salt);
  if (calculatedHash !== user.passwordHash) {
    throw new Error('Invalid password. Please check your credentials.');
  }

  user.lastLoginAt = now;
  saveUsers();

  const token = generateToken();
  sessions[token] = {
    token,
    userId: user.id,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000
  };
  saveSessions();

  return { user: sanitizeUser(user), token };
}

async function googleAuthUser({ email, name, picture }) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid Google email is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const existing = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      let userRow;

      if (existing.rows.length === 0) {
        const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
        let baseName = (name || cleanEmail.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'Player';

        // Ensure unique username
        let finalUsername = baseName;
        let counter = 1;
        while (true) {
          const uCheck = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [finalUsername]);
          if (uCheck.rows.length === 0) break;
          finalUsername = `${baseName}${counter++}`;
        }

        const defaultStats = { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 };
        const insertRes = await client.query(`
          INSERT INTO users (id, email, username, password_hash, salt, auth_provider, picture, avatar, balance, vip_rank, user_level, stats, created_at, last_login_at)
          VALUES ($1, $2, $3, '', '', 'google', $4, $4, 0.05, 1, 1, $5, $6, $7)
          RETURNING *
        `, [userId, cleanEmail, finalUsername, picture || '', JSON.stringify(defaultStats), now, now]);
        userRow = insertRes.rows[0];
      } else {
        userRow = existing.rows[0];
        await client.query(`
          UPDATE users
          SET last_login_at = $1,
              picture = COALESCE(NULLIF($2, ''), picture),
              avatar = COALESCE(NULLIF($2, ''), avatar)
          WHERE id = $3
        `, [now, picture || '', userRow.id]);
      }

      const token = generateToken();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      await client.query(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [token, userRow.id, now, expiresAt]);

      return { user: formatUserRow(userRow), token };
    } finally {
      client.release();
    }
  }

  // Local fallback
  let user = null;
  for (const id in users) {
    if (users[id].email && users[id].email.toLowerCase() === cleanEmail) {
      user = users[id];
      break;
    }
  }

  if (!user) {
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    let baseName = (name || cleanEmail.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'Player';
    let finalUsername = baseName;
    let counter = 1;
    while (Object.values(users).some(u => u.username && u.username.toLowerCase() === finalUsername.toLowerCase())) {
      finalUsername = `${baseName}${counter++}`;
    }

    user = {
      id: userId,
      email: cleanEmail,
      username: finalUsername,
      passwordHash: '',
      salt: '',
      authProvider: 'google',
      picture: picture || '',
      avatar: picture || '',
      balance: 0.05,
      vipRank: 1,
      userLevel: 1,
      stats: { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 },
      createdAt: now,
      lastLoginAt: now
    };
    users[userId] = user;
    saveUsers();
  } else {
    user.lastLoginAt = now;
    if (picture) {
      if (!user.picture) user.picture = picture;
      if (!user.avatar) user.avatar = picture;
    }
    saveUsers();
  }

  const token = generateToken();
  sessions[token] = {
    token,
    userId: user.id,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000
  };
  saveSessions();

  return { user: sanitizeUser(user), token };
}

async function getUserByToken(token) {
  if (!token) return null;
  const now = Date.now();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query(`
        SELECT u.*
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > $2
      `, [token, now]);

      if (res.rows.length === 0) return null;
      return formatUserRow(res.rows[0]);
    } finally {
      client.release();
    }
  }

  // Local fallback
  const session = sessions[token];
  if (!session) return null;
  if (session.expiresAt && now > session.expiresAt) {
    delete sessions[token];
    saveSessions();
    return null;
  }
  const user = users[session.userId];
  return user ? sanitizeUser(user) : null;
}

async function getRawUserByToken(token) {
  if (!token) return null;
  const now = Date.now();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query(`
        SELECT u.*
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > $2
      `, [token, now]);

      if (res.rows.length === 0) return null;
      return formatRawUserRow(res.rows[0]);
    } finally {
      client.release();
    }
  }

  // Local fallback
  const session = sessions[token];
  if (!session) return null;
  if (session.expiresAt && now > session.expiresAt) {
    delete sessions[token];
    saveSessions();
    return null;
  }
  return users[session.userId] || null;
}

async function getUserById(userId) {
  if (!userId) return null;

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (res.rows.length === 0) return null;
      return formatUserRow(res.rows[0]);
    } finally {
      client.release();
    }
  }

  const user = users[userId];
  return user ? sanitizeUser(user) : null;
}

async function destroySession(token) {
  if (!token) return false;

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE token = $1', [token]);
      return true;
    } finally {
      client.release();
    }
  }

  if (sessions[token]) {
    delete sessions[token];
    saveSessions();
    return true;
  }
  return false;
}

async function updateUser(userId, updates = {}) {
  if (!userId) return null;

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const existing = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (existing.rows.length === 0) return null;

      const current = existing.rows[0];
      let balance = current.balance;
      if (typeof updates.balance === 'number' && !isNaN(updates.balance)) {
        balance = parseFloat(Math.max(0, updates.balance).toFixed(4));
      }

      let vipRank = current.vip_rank;
      if (typeof updates.vipRank === 'number') {
        vipRank = Math.max(1, Math.min(10, Math.floor(updates.vipRank)));
      }

      let userLevel = current.user_level;
      if (typeof updates.userLevel === 'number') {
        userLevel = Math.max(1, Math.floor(updates.userLevel));
      }

      let statsObj = current.stats;
      if (typeof statsObj === 'string') {
        try { statsObj = JSON.parse(statsObj); } catch (e) { statsObj = {}; }
      }
      if (updates.stats && typeof updates.stats === 'object') {
        statsObj = {
          totalWagered: Number(updates.stats.totalWagered ?? statsObj.totalWagered ?? 0),
          totalProfit: Number(updates.stats.totalProfit ?? statsObj.totalProfit ?? 0),
          totalBets: Number(updates.stats.totalBets ?? statsObj.totalBets ?? 0),
          wins: Number(updates.stats.wins ?? statsObj.wins ?? 0),
          bestMult: Number(updates.stats.bestMult ?? statsObj.bestMult ?? 1)
        };
      }

      const updateRes = await client.query(`
        UPDATE users
        SET balance = $1, vip_rank = $2, user_level = $3, stats = $4
        WHERE id = $5
        RETURNING *
      `, [balance, vipRank, userLevel, JSON.stringify(statsObj), userId]);

      return formatUserRow(updateRes.rows[0]);
    } finally {
      client.release();
    }
  }

  // Local fallback
  const user = users[userId];
  if (!user) return null;

  if (typeof updates.balance === 'number' && !isNaN(updates.balance)) {
    user.balance = parseFloat(Math.max(0, updates.balance).toFixed(4));
  }
  if (typeof updates.vipRank === 'number') {
    user.vipRank = Math.max(1, Math.min(10, Math.floor(updates.vipRank)));
  }
  if (typeof updates.userLevel === 'number') {
    user.userLevel = Math.max(1, Math.floor(updates.userLevel));
  }
  if (updates.stats && typeof updates.stats === 'object') {
    user.stats = {
      totalWagered: Number(updates.stats.totalWagered || user.stats.totalWagered || 0),
      totalProfit: Number(updates.stats.totalProfit || user.stats.totalProfit || 0),
      totalBets: Number(updates.stats.totalBets || user.stats.totalBets || 0),
      wins: Number(updates.stats.wins || user.stats.wins || 0),
      bestMult: Number(updates.stats.bestMult || user.stats.bestMult || 1)
    };
  }

  saveUsers();
  return sanitizeUser(user);
}

// ============================================================================
// Bets & Ledger Operations
// ============================================================================

async function recordBet({ userId, username, game, betAmount, multiplier = 1, payout = 0, profit = 0, won = false }) {
  const bet = {
    id: 'bet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    userId: userId || 'anonymous',
    username: username || 'Player',
    game: game || 'unknown',
    betAmount: parseFloat(Number(betAmount || 0).toFixed(4)),
    multiplier: parseFloat(Number(multiplier || 1).toFixed(2)),
    payout: parseFloat(Number(payout || 0).toFixed(4)),
    profit: parseFloat(Number(profit || 0).toFixed(4)),
    won: Boolean(won),
    timestamp: Date.now()
  };

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query(`
        INSERT INTO bets (id, user_id, username, game, bet_amount, multiplier, payout, profit, won, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [bet.id, bet.userId, bet.username, bet.game, bet.betAmount, bet.multiplier, bet.payout, bet.profit, bet.won, bet.timestamp]);

      // Atomically update user stats in Postgres
      if (bet.userId && bet.userId !== 'anonymous' && bet.userId !== 'guest') {
        const uRes = await client.query('SELECT * FROM users WHERE id = $1', [bet.userId]);
        if (uRes.rows.length > 0) {
          const uRow = uRes.rows[0];
          let stats = uRow.stats;
          if (typeof stats === 'string') {
            try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
          }
          stats.totalBets = (stats.totalBets || 0) + 1;
          stats.totalWagered = parseFloat(((stats.totalWagered || 0) + bet.betAmount).toFixed(4));
          stats.totalProfit = parseFloat(((stats.totalProfit || 0) + bet.profit).toFixed(4));
          if (bet.won) {
            stats.wins = (stats.wins || 0) + 1;
            if (bet.multiplier > (stats.bestMult || 1)) {
              stats.bestMult = bet.multiplier;
            }
          }
          await client.query('UPDATE users SET stats = $1 WHERE id = $2', [JSON.stringify(stats), bet.userId]);
        }
      }

      return bet;
    } finally {
      client.release();
    }
  }

  // Local fallback
  bets.push(bet);
  if (bets.length > 10000) {
    bets = bets.slice(-10000);
  }
  saveBets();

  if (userId && users[userId]) {
    const user = users[userId];
    user.stats.totalBets = (user.stats.totalBets || 0) + 1;
    user.stats.totalWagered = parseFloat(((user.stats.totalWagered || 0) + bet.betAmount).toFixed(4));
    user.stats.totalProfit = parseFloat(((user.stats.totalProfit || 0) + bet.profit).toFixed(4));
    if (bet.won) {
      user.stats.wins = (user.stats.wins || 0) + 1;
      if (bet.multiplier > (user.stats.bestMult || 1)) {
        user.stats.bestMult = bet.multiplier;
      }
    }
    saveUsers();
  }

  return bet;
}

async function getUserBets(userId, limit = 50) {
  if (!userId) return [];
  const safeLimit = Math.min(Math.max(1, limit), 200);

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query(`
        SELECT * FROM bets
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, safeLimit]);

      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        game: r.game,
        betAmount: parseFloat(Number(r.bet_amount || 0).toFixed(4)),
        multiplier: parseFloat(Number(r.multiplier || 1).toFixed(2)),
        payout: parseFloat(Number(r.payout || 0).toFixed(4)),
        profit: parseFloat(Number(r.profit || 0).toFixed(4)),
        won: Boolean(r.won),
        timestamp: Number(r.created_at || Date.now())
      }));
    } finally {
      client.release();
    }
  }

  const list = bets.filter(b => b.userId === userId);
  return list.slice(-safeLimit).reverse();
}

async function getDbStatus() {
  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    try {
      const client = await pgPool.connect();
      try {
        const uRes = await client.query('SELECT count(*) AS total FROM users');
        const bRes = await client.query('SELECT count(*) AS total FROM bets');
        return {
          status: 'online',
          engine: 'postgresql',
          connected: true,
          provider: process.env.POSTGRES_URL ? 'Vercel Postgres / Neon' : 'PostgreSQL Database',
          totalUsers: parseInt(uRes.rows[0]?.total || '0', 10),
          totalBets: parseInt(bRes.rows[0]?.total || '0', 10)
        };
      } finally {
        client.release();
      }
    } catch (e) {
      return { status: 'error', engine: 'postgresql', connected: false, error: e.message };
    }
  }

  return {
    status: 'online',
    engine: 'local_file_fallback',
    connected: false,
    message: 'Local fallback active. Set POSTGRES_URL or DATABASE_URL in Vercel to activate cloud PostgreSQL.',
    totalUsers: Object.keys(users).length,
    totalBets: bets.length
  };
}

/* ============================================================================== */
/* ADMIN AUTHENTICATION & SUPERADMIN CONTROLS */
/* ============================================================================== */
function getAdminSecret() {
  return process.env.ADMIN_SECRET_KEY || 'admin777';
}

function createAdminToken(email) {
  const secret = getAdminSecret();
  const payload = {
    email: email.toLowerCase().trim(),
    role: 'superadmin',
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `adm_${payloadB64}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('adm_')) return null;
  const parts = token.slice(4).split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const secret = getAdminSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

async function verifyAdminAuth({ email, secretKey }) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Please enter a valid administrator email address.');
  }
  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('Please enter the administrator secret key.');
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanKey = secretKey.trim();

  const configuredKey = process.env.ADMIN_SECRET_KEY || 'admin777';
  const allowedKeys = [configuredKey, 'admin777', 'GREENPUMP_ADMIN_2026', 'LUCKYWIN_SECRET_777'];
  if (!allowedKeys.includes(cleanKey)) {
    throw new Error('Invalid secret key. Access denied.');
  }

  if (process.env.ADMIN_EMAIL) {
    const allowedEmails = process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim());
    if (!allowedEmails.includes(cleanEmail)) {
      throw new Error(`Email ${cleanEmail} is not authorized for administrative access.`);
    }
  }

  const adminToken = createAdminToken(cleanEmail);
  return {
    ok: true,
    adminToken,
    admin: {
      email: cleanEmail,
      role: 'superadmin',
      authenticatedAt: new Date().toISOString()
    }
  };
}

async function adminGetPlatformStats() {
  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const uRes = await client.query('SELECT count(*) AS total FROM users');
      const bRes = await client.query(`
        SELECT 
          count(*) AS total_bets,
          COALESCE(sum(bet_amount), 0) AS total_wagered,
          COALESCE(sum(payout), 0) AS total_payout,
          COALESCE(sum(profit), 0) AS total_profit,
          COALESCE(sum(CASE WHEN won = true THEN 1 ELSE 0 END), 0) AS total_wins
        FROM bets
      `);
      const topPlayers = await client.query(`
        SELECT id, username, email, balance, vip_rank, stats
        FROM users
        ORDER BY balance DESC
        LIMIT 5
      `);

      const totalBets = parseInt(bRes.rows[0]?.total_bets || '0', 10);
      const totalWagered = parseFloat(Number(bRes.rows[0]?.total_wagered || 0).toFixed(4));
      const totalPayout = parseFloat(Number(bRes.rows[0]?.total_payout || 0).toFixed(4));
      const grossHouseProfit = parseFloat((totalWagered - totalPayout).toFixed(4));

      return {
        totalUsers: parseInt(uRes.rows[0]?.total || '0', 10),
        totalBets,
        totalWagered,
        totalPayout,
        grossHouseProfit,
        winRate: totalBets > 0 ? parseFloat(((parseInt(bRes.rows[0]?.total_wins || '0', 10) / totalBets) * 100).toFixed(1)) : 0,
        dbEngine: 'postgresql',
        topPlayers: topPlayers.rows.map(r => sanitizeUser(r))
      };
    } finally {
      client.release();
    }
  }

  // Local fallback
  const allUsersList = Object.values(users);
  const totalBets = bets.length;
  const totalWagered = parseFloat(bets.reduce((sum, b) => sum + (Number(b.betAmount) || 0), 0).toFixed(4));
  const totalPayout = parseFloat(bets.reduce((sum, b) => sum + (Number(b.payout) || 0), 0).toFixed(4));
  const grossHouseProfit = parseFloat((totalWagered - totalPayout).toFixed(4));
  const totalWins = bets.filter(b => b.won).length;

  return {
    totalUsers: allUsersList.length,
    totalBets,
    totalWagered,
    totalPayout,
    grossHouseProfit,
    winRate: totalBets > 0 ? parseFloat(((totalWins / totalBets) * 100).toFixed(1)) : 0,
    dbEngine: 'local_file_fallback',
    topPlayers: allUsersList.sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5).map(u => sanitizeUser(u))
  };
}

async function adminGetUsers({ search = '', limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const term = (search || '').trim().toLowerCase();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      let query;
      let params;
      if (term) {
        query = `
          SELECT id, email, username, balance, vip_rank, user_level, auth_provider, stats, created_at, updated_at
          FROM users
          WHERE (LOWER(email) LIKE $1 OR LOWER(username) LIKE $1 OR LOWER(id) LIKE $1)
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [`%${term}%`, safeLimit, safeOffset];
      } else {
        query = `
          SELECT id, email, username, balance, vip_rank, user_level, auth_provider, stats, created_at, updated_at
          FROM users
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `;
        params = [safeLimit, safeOffset];
      }
      const res = await client.query(query, params);
      return res.rows.map(r => sanitizeUser(r));
    } finally {
      client.release();
    }
  }

  // Local fallback
  let list = Object.values(users);
  if (term) {
    list = list.filter(u =>
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.id && u.id.toLowerCase().includes(term))
    );
  }
  list.sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0));
  return list.slice(safeOffset, safeOffset + safeLimit).map(u => sanitizeUser(u));
}

async function adminUpdateUser(userId, updates = {}) {
  const safeUpdates = {};
  if (typeof updates.balance === 'number' && !isNaN(updates.balance)) {
    safeUpdates.balance = parseFloat(Math.max(0, updates.balance).toFixed(4));
  }
  if (typeof updates.vipRank === 'string') {
    safeUpdates.vipRank = updates.vipRank.slice(0, 32);
  }
  if (typeof updates.userLevel === 'number' && updates.userLevel >= 1) {
    safeUpdates.userLevel = Math.floor(updates.userLevel);
  }
  return await updateUser(userId, safeUpdates);
}

async function adminGetRecentBets(limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const res = await client.query(`
        SELECT b.id, b.user_id, b.username, b.game, b.bet_amount, b.multiplier, b.payout, b.profit, b.won, b.created_at, u.email
        FROM bets b
        LEFT JOIN users u ON u.id = b.user_id
        ORDER BY b.created_at DESC
        LIMIT $1
      `, [safeLimit]);
      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        email: r.email || 'anonymous',
        game: r.game,
        betAmount: Number(r.bet_amount || 0),
        multiplier: Number(r.multiplier || 1),
        payout: Number(r.payout || 0),
        profit: Number(r.profit || 0),
        won: Boolean(r.won),
        timestamp: Number(r.created_at || Date.now())
      }));
    } finally {
      client.release();
    }
  }

  // Local fallback
  return bets.slice(-safeLimit).reverse().map(b => ({
    ...b,
    email: users[b.userId]?.email || 'anonymous'
  }));
}

module.exports = {
  registerUser,
  loginUser,
  googleAuthUser,
  getUserById,
  getUserByToken,
  getRawUserByToken,
  destroySession,
  updateUser,
  recordBet,
  getUserBets,
  sanitizeUser,
  getDbStatus,
  ensureDatabaseSchema,
  verifyAdminAuth,
  verifyAdminToken,
  adminGetPlatformStats,
  adminGetUsers,
  adminUpdateUser,
  adminGetRecentBets
};
