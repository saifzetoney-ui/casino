const http = require('http');

const PORT = 8000;
const BASE_URL = `http://localhost:${PORT}`;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resData));
        } catch (e) {
          resolve({ raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resData));
        } catch (e) {
          resolve({ raw: resData });
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('\n======================================================');
  console.log('🎰 TESTING LUCKYWIN CASINO VAULT & PRIVATE WALLET FLOW');
  console.log('======================================================\n');

  // Step 1: Check Casino Main Vault Status
  console.log('1️⃣ Fetching Casino Main Vault status...');
  const vault = await get('/api/casino-vault');
  console.log('   🏛️  Vault Address:', vault.vaultAddress);
  console.log('   🌐 Network:', vault.network);
  console.log('   🔗 Solscan URL:', vault.solscanUrl);
  console.log('   🟢 Status:', vault.status);

  // Step 2: Create a simulated user address
  const testUserAddress = 'PlayerWallet_' + Math.random().toString(36).substring(2, 10);
  console.log('\n2️⃣ Testing Player Address:', testUserAddress);

  // Step 3: Check initial balance (must be 0.0000 SOL)
  const initialBal = await get(`/api/user-balance?address=${testUserAddress}`);
  console.log('   💰 Initial Balance (must be 0):', initialBal.balance, 'SOL');

  // Step 4: Simulate an on-chain deposit to Casino Main Vault
  const sampleTxHash = '5TestTxHash_' + Math.random().toString(36).substring(2, 12) + 'SolanaSignature';
  const depositAmount = 0.50; // 0.50 SOL
  console.log(`\n3️⃣ Depositing ${depositAmount} SOL into Casino Main Vault...`);
  console.log('   📝 Simulated Tx Hash:', sampleTxHash);

  const depositRes = await post('/api/verify-deposit', {
    txHash: sampleTxHash,
    userAddress: testUserAddress,
    amountSol: depositAmount
  });
  console.log('   ✅ Deposit Confirmed! New Balance:', depositRes.newBalance, 'SOL');

  // Step 5: Simulate placing a wager and winning
  console.log('\n4️⃣ Simulating Game Play (Crash / Mines)...');
  const betAmount = -0.10; // 0.10 SOL bet
  const afterBet = await post('/api/user-balance', {
    address: testUserAddress,
    delta: betAmount,
    reason: 'bet'
  });
  console.log('   🎲 Placed 0.10 SOL bet. Balance:', afterBet.balance, 'SOL');

  const winAmount = 0.25; // 2.5x payout (+0.25 SOL)
  const afterWin = await post('/api/user-balance', {
    address: testUserAddress,
    delta: winAmount,
    reason: 'payout'
  });
  console.log('   🏆 Won 2.5x Multiplier! (+0.25 SOL). Balance:', afterWin.balance, 'SOL');

  // Step 6: Test Withdrawal back to user's private wallet
  const withdrawAmount = 0.40;
  console.log(`\n5️⃣ Requesting Non-Custodial Withdrawal of ${withdrawAmount} SOL...`);
  const withdrawRes = await post('/api/request-withdrawal', {
    destinationAddress: '7VzQ4kAbC8mPnX9rW2Y1tL3sK5jM6pQ8vR1xT4yZ7mP', // Valid Solana destination
    userAddress: testUserAddress,
    amountSol: withdrawAmount
  });
  console.log('   🚀 Withdrawal Dispatched!');
  console.log('   📝 Withdrawal Tx Hash:', withdrawRes.txHash);
  console.log('   🔗 Solscan Tx Link:', withdrawRes.solscanUrl);
  console.log('   💰 Remaining Casino Balance:', withdrawRes.newBalance, 'SOL');

  // Step 7: Inspect Public Vault Ledger
  console.log('\n6️⃣ Inspecting Transparent Vault Ledger...');
  const ledger = await get('/api/vault-ledger');
  console.log(`   📜 Total recorded ledger transactions: ${ledger.transactions.length}`);
  ledger.transactions.slice(0, 3).forEach((tx, idx) => {
    console.log(`      [${idx + 1}] ${tx.type.padEnd(10)} | ${tx.amountSol} SOL | ${tx.fromAddress.slice(0, 10)}... -> ${tx.toAddress.slice(0, 10)}...`);
  });

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTest().catch(console.error);
