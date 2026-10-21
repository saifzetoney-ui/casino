const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

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

// In-memory data structures
let users = {};         // userId -> user
let sessions = {};      // token -> session
let bets = [];          // Array of bet records

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

// Initialize databases from disk
function initDatabase() {
  users = safeLoadJson(USERS_FILE, {});
  sessions = safeLoadJson(SESSIONS_FILE, {});
  bets = safeLoadJson(BETS_FILE, []);

  // Guarantee seed admin or sample player if empty
  if (Object.keys(users).length === 0) {
    console.log('[Database] Initialized fresh user database.');
  } else {
    console.log(`[Database] Loaded ${Object.keys(users).length} users, ${Object.keys(sessions).length} sessions, ${bets.length} bets.`);
  }
}

initDatabase();

function saveUsers() {
  safeWriteJson(USERS_FILE, users);
}

function saveSessions() {
  safeWriteJson(SESSIONS_FILE, sessions);
}

function saveBets() {
  safeWriteJson(BETS_FILE, bets.slice(-10000));
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ==========================================
// User Operations
// ==========================================

function findUserByEmail(email) {
  if (!email) return null;
  const norm = email.trim().toLowerCase();
  for (const id in users) {
    if (users[id].email && users[id].email.toLowerCase() === norm) {
      return users[id];
    }
  }
  return null;
}

function findUserByUsername(username) {
  if (!username) return null;
  const norm = username.trim().toLowerCase();
  for (const id in users) {
    if (users[id].username && users[id].username.toLowerCase() === norm) {
      return users[id];
    }
  }
  return null;
}

function getUserById(userId) {
  return users[userId] || null;
}

function createSession(userId) {
  const token = generateToken();
  const session = {
    token,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  sessions[token] = session;
  saveSessions();
  return token;
}

function getUserByToken(token) {
  if (!token || !sessions[token]) return null;
  const session = sessions[token];
  if (session.expiresAt && Date.now() > session.expiresAt) {
    delete sessions[token];
    saveSessions();
    return null;
  }
  const user = getUserById(session.userId);
  return user ? sanitizeUser(user) : null;
}

function getRawUserByToken(token) {
  if (!token || !sessions[token]) return null;
  const session = sessions[token];
  if (session.expiresAt && Date.now() > session.expiresAt) {
    delete sessions[token];
    saveSessions();
    return null;
  }
  return getUserById(session.userId);
}

function destroySession(token) {
  if (token && sessions[token]) {
    delete sessions[token];
    saveSessions();
    return true;
  }
  return false;
}

function registerUser({ email, username, password, initialBalance = 0.05 }) {
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

  if (findUserByEmail(cleanEmail)) {
    throw new Error('An account with this email already exists. Please log in.');
  }

  if (findUserByUsername(cleanUsername)) {
    throw new Error('This username is already taken. Please choose another.');
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
    balance: Math.max(0, Number(initialBalance) || 0.05),
    vipRank: 1,
    userLevel: 1,
    stats: {
      totalWagered: 0,
      totalProfit: 0,
      totalBets: 0,
      wins: 0,
      bestMult: 1
    },
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  users[userId] = newUser;
  saveUsers();

  const token = createSession(userId);
  return { user: sanitizeUser(newUser), token };
}

function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanInput = email.trim().toLowerCase();
  let user = findUserByEmail(cleanInput) || findUserByUsername(cleanInput);

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

  user.lastLoginAt = Date.now();
  saveUsers();

  const token = createSession(user.id);
  return { user: sanitizeUser(user), token };
}

function googleAuthUser({ email, name }) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid Google email is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = findUserByEmail(cleanEmail);

  if (!user) {
    // Auto-create user for Google auth
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    let baseName = (name || cleanEmail.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    if (!baseName) baseName = 'Player';
    
    // Ensure unique username
    let finalUsername = baseName;
    let counter = 1;
    while (findUserByUsername(finalUsername)) {
      finalUsername = `${baseName}${counter++}`;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    user = {
      id: userId,
      email: cleanEmail,
      username: finalUsername,
      passwordHash: '',
      salt,
      authProvider: 'google',
      balance: 0.05,
      vipRank: 1,
      userLevel: 1,
      stats: {
        totalWagered: 0,
        totalProfit: 0,
        totalBets: 0,
        wins: 0,
        bestMult: 1
      },
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
    users[userId] = user;
    saveUsers();
  } else {
    user.lastLoginAt = Date.now();
    saveUsers();
  }

  const token = createSession(user.id);
  return { user: sanitizeUser(user), token };
}

function updateUser(userId, updates = {}) {
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

// ==========================================
// Bets & Game Transactions
// ==========================================

function recordBet({ userId, username, game, betAmount, multiplier = 1, payout = 0, profit = 0, won = false }) {
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

  bets.push(bet);
  if (bets.length > 10000) {
    bets = bets.slice(-10000);
  }
  saveBets();

  // If tied to a registered user, atomically update stats & balance
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

function getUserBets(userId, limit = 50) {
  if (!userId) return [];
  const list = bets.filter(b => b.userId === userId);
  return list.slice(-Math.min(limit, 200)).reverse();
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
  sanitizeUser
};
