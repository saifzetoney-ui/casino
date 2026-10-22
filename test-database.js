const assert = require('assert');
const db = require('./database');

async function runTests() {
  console.log('--- Starting Database Tests ---');

  const status = await db.getDbStatus();
  console.log('Database Status:', status);

  const testEmail = `test_${Date.now()}@gamblin.io`;
  const testUsername = `player_${Math.random().toString(36).slice(2, 7)}`;
  const testPassword = 'Password123!';

  console.log('\n1. Testing Registration...');
  const regResult = await db.registerUser({
    email: testEmail,
    username: testUsername,
    password: testPassword,
    initialBalance: 0.1
  });

  assert(regResult.user, 'Registration must return user');
  assert(regResult.token, 'Registration must return token');
  assert.strictEqual(regResult.user.email, testEmail);
  assert.strictEqual(regResult.user.username, testUsername);
  assert.strictEqual(regResult.user.balance, 0.1);
  assert(!regResult.user.passwordHash, 'User object must be sanitized (no passwordHash)');
  assert(!regResult.user.salt, 'User object must be sanitized (no salt)');
  console.log('✓ Registration passed for', testEmail);

  console.log('\n2. Testing Duplicate Registration Prevention...');
  try {
    await db.registerUser({ email: testEmail, username: 'another', password: 'Password123!' });
    assert.fail('Duplicate email should have thrown error');
  } catch (err) {
    assert(err.message.includes('already exists'), 'Expected duplicate email error');
    console.log('✓ Duplicate email correctly rejected:', err.message);
  }

  console.log('\n3. Testing Login from Another Session / Browser...');
  const loginResult = await db.loginUser({
    email: testEmail,
    password: testPassword
  });
  assert(loginResult.user, 'Login must return user');
  assert(loginResult.token, 'Login must return token');
  assert.strictEqual(loginResult.user.email, testEmail);
  console.log('✓ Login passed with valid credentials');

  console.log('\n4. Testing Wrong Password Rejection...');
  try {
    await db.loginUser({ email: testEmail, password: 'wrongpassword' });
    assert.fail('Wrong password should have failed');
  } catch (err) {
    assert(err.message.includes('Invalid password'), 'Expected invalid password error');
    console.log('✓ Wrong password correctly rejected:', err.message);
  }

  console.log('\n5. Testing Session Verification (getUserByToken)...');
  const sessionUser = await db.getUserByToken(loginResult.token);
  assert(sessionUser, 'Valid token must resolve user');
  assert.strictEqual(sessionUser.id, regResult.user.id);
  console.log('✓ Session verified for user ID:', sessionUser.id);

  console.log('\n6. Testing Bet Recording & Stats Updates...');
  const bet = await db.recordBet({
    userId: sessionUser.id,
    username: sessionUser.username,
    game: 'crash',
    betAmount: 0.02,
    multiplier: 2.5,
    payout: 0.05,
    profit: 0.03,
    won: true
  });
  assert(bet.id, 'Bet must have an ID');
  assert.strictEqual(bet.won, true);

  const updatedUser = await db.getUserById(sessionUser.id);
  assert(updatedUser.stats.totalBets >= 1, 'Total bets must be at least 1');
  assert(updatedUser.stats.wins >= 1, 'Wins must be at least 1');
  assert(updatedUser.stats.totalWagered >= 0.02, 'Total wagered updated');
  console.log('✓ Bet recorded and user stats updated:', updatedUser.stats);

  console.log('\n7. Testing Bets History Retrieval...');
  const bets = await db.getUserBets(sessionUser.id, 10);
  assert(bets.length >= 1, 'Must retrieve bet history');
  assert.strictEqual(bets[0].game, 'crash');
  console.log('✓ Bet history retrieved:', bets.length, 'records');

  console.log('\n8. Testing Session Destruction (Logout)...');
  const destroyed = await db.destroySession(loginResult.token);
  assert.strictEqual(destroyed, true);
  const deadUser = await db.getUserByToken(loginResult.token);
  assert.strictEqual(deadUser, null, 'Destroyed token must return null');
  console.log('✓ Session destroyed on logout');

  console.log('\n=== ALL DATABASE TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
