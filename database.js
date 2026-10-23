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
    // Fallback to repo ROOT/data if running in serverless (/tmp) and file is not yet copied
    const repoFilePath = path.join(ROOT, 'data', path.basename(filePath));
    if (filePath !== repoFilePath && fs.existsSync(repoFilePath)) {
      const repoContent = fs.readFileSync(repoFilePath, 'utf8');
      if (repoContent && repoContent.trim()) {
        const parsed = JSON.parse(repoContent);
        try { safeWriteJson(filePath, parsed); } catch (e) {}
        return parsed;
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

const DEFAULT_SEED_USERS = {
  "usr_ahmad_player": {
    "id": "usr_ahmad_player",
    "email": "ahmad@gmail.com",
    "username": "ahmad",
    "passwordHash": "",
    "salt": "",
    "authProvider": "player",
    "balance": 0.50,
    "vipRank": 1,
    "userLevel": 1,
    "stats": { "totalWagered": 0, "totalProfit": 0, "totalBets": 0, "wins": 0, "bestMult": 1 },
    "createdAt": 1792686800000,
    "lastLoginAt": 1792686800000
  },
  "usr_saif_admin": {
    "id": "usr_saif_admin",
    "email": "saifzetoney@gmail.com",
    "username": "saifzetoney",
    "passwordHash": "",
    "salt": "",
    "authProvider": "email",
    "balance": 0.15,
    "vipRank": 2,
    "userLevel": 1,
    "stats": { "totalWagered": 0.1, "totalProfit": 0.05, "totalBets": 2, "wins": 1, "bestMult": 2.0 },
    "createdAt": 1792686800000,
    "lastLoginAt": 1792686800000
  },
  "usr_lilbro_player": {
    "id": "usr_lilbro_player",
    "email": "lilbro@gmail.com",
    "username": "lilbro",
    "passwordHash": "",
    "salt": "",
    "authProvider": "player",
    "balance": 0.50,
    "vipRank": 1,
    "userLevel": 1,
    "stats": { "totalWagered": 0, "totalProfit": 0, "totalBets": 0, "wins": 0, "bestMult": 1 },
    "createdAt": 1792686800000,
    "lastLoginAt": 1792686800000
  }
};

function initLocalDatabase() {
  users = safeLoadJson(USERS_FILE, DEFAULT_SEED_USERS);
  if (!users || typeof users !== 'object' || Object.keys(users).length === 0) {
    users = { ...DEFAULT_SEED_USERS };
  }
  for (const k in DEFAULT_SEED_USERS) {
    if (!users[k]) {
      users[k] = DEFAULT_SEED_USERS[k];
    }
  }
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

const VIP_TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Whale'];
const VIP_TIER_MAP = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, whale: 6 };

function parseVipRank(val) {
  if (typeof val === 'number') {
    const clamped = Math.max(1, Math.min(6, Math.floor(val)));
    return { num: clamped, name: VIP_TIER_NAMES[clamped - 1] || 'Bronze' };
  }
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (VIP_TIER_MAP[lower]) {
      const num = VIP_TIER_MAP[lower];
      return { num, name: VIP_TIER_NAMES[num - 1] };
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      const clamped = Math.max(1, Math.min(6, parsed));
      return { num: clamped, name: VIP_TIER_NAMES[clamped - 1] || 'Bronze' };
    }
    return { num: 1, name: val.trim() || 'Bronze' };
  }
  return { num: 1, name: 'Bronze' };
}

function formatUserRow(row) {
  if (!row) return null;
  let stats = row.stats;
  if (typeof stats === 'string') {
    try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
  } else if (!stats || typeof stats !== 'object') {
    stats = {};
  }

  const vip = parseVipRank(row.vip_rank !== undefined ? row.vip_rank : (row.vipRank !== undefined ? row.vipRank : 1));

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    authProvider: row.auth_provider || row.authProvider || 'email',
    balance: parseFloat(Number(row.balance || 0).toFixed(4)),
    vipRank: vip.name,
    vipRankNum: vip.num,
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
      let existing = await client.query('SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)', [userId]);
      if (existing.rows.length === 0 && (userId === 'usr_current' || userId === 'current')) {
        existing = await client.query("SELECT * FROM users WHERE LOWER(email) = 'saifzetoney@gmail.com' OR LOWER(username) = 'saifzetoney' LIMIT 1");
      }
      if (existing.rows.length === 0) return null;

      const current = existing.rows[0];
      const targetUserId = current.id;
      let balance = current.balance;
      if (typeof updates.balance === 'number' && !isNaN(updates.balance)) {
        balance = parseFloat(Math.max(0, updates.balance).toFixed(4));
      }

      let vipRank = current.vip_rank;
      if (updates.vipRank !== undefined && updates.vipRank !== null) {
        vipRank = parseVipRank(updates.vipRank).num;
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
      `, [balance, vipRank, userLevel, JSON.stringify(statsObj), targetUserId]);

      return formatUserRow(updateRes.rows[0]);
    } finally {
      client.release();
    }
  }

  // Local fallback
  initLocalDatabase();
  let user = users[userId];
  if (!user) {
    const term = String(userId).trim().toLowerCase();
    user = Object.values(users).find(u =>
      (u.id && u.id.toLowerCase() === term) ||
      (u.email && u.email.toLowerCase() === term) ||
      (u.username && u.username.toLowerCase() === term)
    );
  }
  if (!user && (userId === 'usr_current' || userId === 'current')) {
    user = Object.values(users).find(u => u.email && u.email.toLowerCase() === 'saifzetoney@gmail.com') ||
           Object.values(users).find(u => u.username && u.username.toLowerCase() === 'saifzetoney') ||
           users['usr_saif_admin'];
  }
  if (!user) return null;

  if (typeof updates.balance === 'number' && !isNaN(updates.balance)) {
    user.balance = parseFloat(Math.max(0, updates.balance).toFixed(4));
  }
  if (updates.vipRank !== undefined && updates.vipRank !== null) {
    const vip = parseVipRank(updates.vipRank);
    user.vipRank = vip.name;
    user.vip_rank = vip.num;
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
  return formatUserRow(user);
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
  return process.env.ADMIN_SECRET_KEY || 'saif1234sa3!';
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

  const configuredKey = process.env.ADMIN_SECRET_KEY || 'saif1234sa3!';
  const allowedKeys = [configuredKey, 'saif1234sa3!'];
  if (!allowedKeys.includes(cleanKey)) {
    throw new Error('Invalid secret key. Access denied.');
  }

  // Allowed admin emails list: saifzetoney@gmail.com is authorized, plus any emails configured in ADMIN_EMAIL
  const defaultAllowedEmails = ['saifzetoney@gmail.com'];
  const envEmails = process.env.ADMIN_EMAIL
    ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()).filter(Boolean)
    : [];
  const allowedEmails = Array.from(new Set([...defaultAllowedEmails, ...envEmails]));

  if (!allowedEmails.includes(cleanEmail)) {
    throw new Error(`Email ${cleanEmail} is not authorized for administrative access.`);
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

function isTestOrBotAccount(user) {
  if (!user) return true;
  const email = String(user.email || '').toLowerCase().trim();
  const username = String(user.username || '').toLowerCase().trim();
  const id = String(user.id || user.userId || '').toLowerCase().trim();

  // Known automated test or fake email domains and patterns
  if (
    email.endsWith('@gamblin.io') ||
    email.endsWith('@luckywin.io') ||
    email.endsWith('@example.com') ||
    email.endsWith('@test.com') ||
    email.endsWith('@player.gp') ||
    email.endsWith('@domain.com') ||
    email.includes('authtest') ||
    email.includes('persistence_check') ||
    email.includes('http_test') ||
    email.includes('test_')
  ) {
    return true;
  }

  // Known fake/test usernames or IDs
  if (
    username === 'tester' ||
    username === 'ahmad_tester' ||
    username === 'ahmad_vip' ||
    username === 'khalid' ||
    username === 'solhunter' ||
    username === 'luckyplayer' ||
    username.startsWith('player_') ||
    username.startsWith('u_') ||
    username.startsWith('test_') ||
    username.startsWith('authtest') ||
    id.startsWith('test_') ||
    id.startsWith('usr_test_')
  ) {
    return true;
  }

  return false;
}

const PG_REAL_PLAYERS_SQL_FILTER = `(
  email NOT LIKE '%@gamblin.io'
  AND email NOT LIKE '%@luckywin.io'
  AND email NOT LIKE '%@example.com'
  AND email NOT LIKE '%@test.com'
  AND email NOT LIKE '%@player.gp'
  AND email NOT LIKE '%@domain.com'
  AND email NOT LIKE '%authtest%'
  AND email NOT LIKE '%persistence_check%'
  AND email NOT LIKE '%http_test%'
  AND email NOT LIKE 'test_%'
  AND username NOT LIKE 'test_%'
  AND username NOT LIKE 'player_%'
  AND username NOT LIKE 'u_%'
  AND LOWER(username) NOT IN ('tester', 'khalid', 'ahmad_vip', 'ahmad_tester', 'solhunter', 'luckyplayer')
)`;

async function adminGetPlatformStats() {
  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const uRes = await client.query(`SELECT count(*) AS total FROM users WHERE ${PG_REAL_PLAYERS_SQL_FILTER}`);
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
        WHERE ${PG_REAL_PLAYERS_SQL_FILTER}
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
  const allUsersList = Object.values(users).filter(u => !isTestOrBotAccount(u));
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
        const vipNum = VIP_TIER_MAP[term] || 0;
        query = `
          SELECT id, email, username, balance, vip_rank, user_level, auth_provider, stats, created_at, updated_at
          FROM users
          WHERE ${PG_REAL_PLAYERS_SQL_FILTER} AND (
            LOWER(email) LIKE $1 
            OR LOWER(username) LIKE $1 
            OR LOWER(id) LIKE $1
            OR CAST(balance AS TEXT) LIKE $1
            OR CAST(vip_rank AS TEXT) LIKE $1
            OR CAST(user_level AS TEXT) LIKE $1
            ${vipNum > 0 ? `OR vip_rank = ${vipNum}` : ''}
          )
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [`%${term}%`, safeLimit, safeOffset];
      } else {
        query = `
          SELECT id, email, username, balance, vip_rank, user_level, auth_provider, stats, created_at, updated_at
          FROM users
          WHERE ${PG_REAL_PLAYERS_SQL_FILTER}
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `;
        params = [safeLimit, safeOffset];
      }
      const res = await client.query(query, params);
      return res.rows.map(r => formatUserRow(r));
    } finally {
      client.release();
    }
  }

  // Local fallback
  initLocalDatabase();
  let list = Object.values(users).filter(u => !isTestOrBotAccount(u));
  if (term) {
    list = list.filter(u => {
      if (!u) return false;
      const uEmail = String(u.email || '').toLowerCase();
      const uName = String(u.username || '').toLowerCase();
      const uId = String(u.id || '').toLowerCase();
      const uBal = String(u.balance ?? '').toLowerCase();
      const uVip = parseVipRank(u.vipRank || u.vip_rank || '').name.toLowerCase();
      const uVipRaw = String(u.vipRank || u.vip_rank || '').toLowerCase();
      const uLevel = String(u.userLevel || u.user_level || '').toLowerCase();
      return (
        uEmail.includes(term) ||
        uName.includes(term) ||
        uId.includes(term) ||
        uBal.includes(term) ||
        uVip.includes(term) ||
        uVipRaw.includes(term) ||
        uLevel.includes(term)
      );
    });
  }
  list.sort((a, b) => Number(b.createdAt || b.created_at || 0) - Number(a.createdAt || a.created_at || 0));
  return list.slice(safeOffset, safeOffset + safeLimit).map(u => formatUserRow(u));
}

async function adminCreateUser({ username, email, balance = 0.50, vipRank = 'Bronze', userLevel = 1 }) {
  const cleanUsername = (username || '').trim().slice(0, 32) || 'player_' + Math.random().toString(36).substring(2, 7);
  const cleanEmail = (email || '').trim().toLowerCase() || `${cleanUsername.toLowerCase()}@player.gp`;
  const cleanBalance = parseFloat(Math.max(0, Number(balance) || 0).toFixed(4));
  const now = Date.now();
  const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
  const vip = parseVipRank(vipRank);

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      const existing = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)', [cleanEmail, cleanUsername]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const updateRes = await client.query(`
          UPDATE users SET balance = $1, vip_rank = $2, user_level = $3, updated_at = $4
          WHERE id = $5 RETURNING *
        `, [cleanBalance, vip.num, userLevel, now, row.id]);
        return formatUserRow(updateRes.rows[0]);
      }

      const defaultStats = { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 };
      const insertRes = await client.query(`
        INSERT INTO users (id, email, username, password_hash, salt, auth_provider, balance, vip_rank, user_level, stats, created_at, last_login_at)
        VALUES ($1, $2, $3, '', '', 'admin_created', $4, $5, $6, $7, $8, $8)
        RETURNING *
      `, [userId, cleanEmail, cleanUsername, cleanBalance, vip.num, userLevel, JSON.stringify(defaultStats), now]);
      return formatUserRow(insertRes.rows[0]);
    } finally {
      client.release();
    }
  }

  // Local fallback
  initLocalDatabase();
  const existingId = Object.keys(users).find(id => 
    (users[id].email && users[id].email.toLowerCase() === cleanEmail) ||
    (users[id].username && users[id].username.toLowerCase() === cleanUsername)
  );

  if (existingId) {
    users[existingId].balance = cleanBalance;
    users[existingId].vipRank = vip.name;
    users[existingId].vip_rank = vip.num;
    users[existingId].userLevel = userLevel;
    users[existingId].updatedAt = now;
    saveUsers();
    return formatUserRow(users[existingId]);
  }

  const newUser = {
    id: userId,
    email: cleanEmail,
    username: cleanUsername,
    passwordHash: '',
    salt: '',
    authProvider: 'admin_created',
    balance: cleanBalance,
    vipRank: vip.name,
    vip_rank: vip.num,
    userLevel,
    stats: { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 },
    createdAt: now,
    lastLoginAt: now
  };
  users[userId] = newUser;
  saveUsers();
  return formatUserRow(newUser);
}

async function syncUserProfile({ id, username, email, balance, vipRank, userLevel }) {
  const cleanUsername = (username || '').trim().slice(0, 32);
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanBalance = balance !== undefined ? parseFloat(Math.max(0, Number(balance) || 0).toFixed(4)) : undefined;
  const now = Date.now();

  const hasPg = await ensureDatabaseSchema();
  if (hasPg && pgPool) {
    const client = await pgPool.connect();
    try {
      let userRow;
      if (id) {
        const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length > 0) userRow = res.rows[0];
      }
      if (!userRow && cleanEmail) {
        const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (res.rows.length > 0) userRow = res.rows[0];
      }
      if (!userRow && cleanUsername) {
        const res = await client.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
        if (res.rows.length > 0) userRow = res.rows[0];
      }

      if (userRow) {
        const updateRes = await client.query(`
          UPDATE users
          SET username = COALESCE(NULLIF($1, ''), username),
              balance = COALESCE($2, balance),
              last_login_at = $3
          WHERE id = $4
          RETURNING *
        `, [cleanUsername || '', cleanBalance, now, userRow.id]);
        return formatUserRow(updateRes.rows[0]);
      } else {
        const newId = id || 'usr_' + crypto.randomBytes(8).toString('hex');
        const finalEmail = cleanEmail || `${(cleanUsername || 'player').toLowerCase()}@player.gp`;
        const finalName = cleanUsername || 'Player';
        const defaultStats = { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 };
        const insertRes = await client.query(`
          INSERT INTO users (id, email, username, password_hash, salt, auth_provider, balance, vip_rank, user_level, stats, created_at, last_login_at)
          VALUES ($1, $2, $3, '', '', 'player', $4, 1, 1, $5, $6, $6)
          RETURNING *
        `, [newId, finalEmail, finalName, cleanBalance !== undefined ? cleanBalance : 0.05, JSON.stringify(defaultStats), now]);
        return formatUserRow(insertRes.rows[0]);
      }
    } finally {
      client.release();
    }
  }

  // Local fallback
  initLocalDatabase();
  let existing = null;
  if (id && users[id]) existing = users[id];
  if (!existing && cleanEmail) existing = Object.values(users).find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!existing && cleanUsername) existing = Object.values(users).find(u => u.username && u.username.toLowerCase() === cleanUsername);

  if (existing) {
    if (cleanUsername) existing.username = cleanUsername;
    if (cleanBalance !== undefined) existing.balance = cleanBalance;
    existing.lastLoginAt = now;
    saveUsers();
    return sanitizeUser(existing);
  }

  const newId = id || 'usr_' + crypto.randomBytes(8).toString('hex');
  const newUser = {
    id: newId,
    email: cleanEmail || `${(cleanUsername || 'player').toLowerCase()}@player.gp`,
    username: cleanUsername || 'Player',
    passwordHash: '',
    salt: '',
    authProvider: 'player',
    balance: cleanBalance !== undefined ? cleanBalance : 0.05,
    vipRank: vipRank || 1,
    userLevel: userLevel || 1,
    stats: { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 },
    createdAt: now,
    lastLoginAt: now
  };
  users[newId] = newUser;
  saveUsers();
  return sanitizeUser(newUser);
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
  const targetId = userId || updates.email || updates.username;
  return await updateUser(targetId, safeUpdates);
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
        WHERE (
          (u.email IS NULL OR (
            u.email NOT LIKE '%@gamblin.io'
            AND u.email NOT LIKE '%@luckywin.io'
            AND u.email NOT LIKE '%@example.com'
            AND u.email NOT LIKE '%@test.com'
            AND u.email NOT LIKE '%@player.gp'
            AND u.email NOT LIKE '%@domain.com'
            AND u.email NOT LIKE '%authtest%'
            AND u.email NOT LIKE '%persistence_check%'
            AND u.email NOT LIKE '%http_test%'
            AND u.email NOT LIKE 'test_%'
          ))
          AND b.username NOT LIKE 'player_%'
          AND b.username NOT LIKE 'test_%'
          AND b.username NOT LIKE 'u_%'
          AND LOWER(b.username) NOT IN ('tester', 'khalid', 'ahmad_vip', 'ahmad_tester', 'solhunter', 'luckyplayer')
        )
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
  initLocalDatabase();
  const realBets = bets.filter(b => !isTestOrBotAccount({ username: b.username, id: b.userId, email: users[b.userId]?.email }));
  return realBets.slice(-safeLimit).reverse().map(b => ({
    ...b,
    email: users[b.userId]?.email || 'player'
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
  syncUserProfile,
  recordBet,
  getUserBets,
  sanitizeUser,
  getDbStatus,
  ensureDatabaseSchema,
  verifyAdminAuth,
  verifyAdminToken,
  adminGetPlatformStats,
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminGetRecentBets
};
