import axios from 'axios';

async function testEtherscanSimple() {
  console.log('🔍 测试 Etherscan API Key...\n');

  const apiKey = 'C7SWRR2JNJ8DMVSPXTD6H9EUV4G9P3MNS3';
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  try {
    // 测试 1: 获取账户余额（简单测试）
    console.log('测试 1: 获取账户余额...');
    const balanceResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: '0x1234567890123456789012345678901234567890',
        apikey: apiKey,
      },
      timeout: 10000,
    });
    
    console.log(`   状态: ${balanceResponse.data.status}`);
    console.log(`   消息: ${balanceResponse.data.message}`);
    console.log(`   结果: ${balanceResponse.data.result}\n`);

    // 测试 2: 查询 USDC 合约信息
    console.log('测试 2: 查询 USDC 合约信息...');
    const contractResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'contract',
        action: 'getabi',
        address: usdcAddress,
        apikey: apiKey,
      },
      timeout: 10000,
    });
    
    console.log(`   状态: ${contractResponse.data.status}`);
    console.log(`   消息: ${contractResponse.data.message}`);
    if (contractResponse.data.status === '1') {
      console.log(`   ✅ 成功获取 USDC ABI\n`);
    } else {
      console.log(`   ❌ 无法获取 USDC ABI\n`);
    }

    // 测试 3: 查询最近的交易（不使用 getLogs）
    console.log('测试 3: 查询最近的 USDC 转账...');
    const txResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'tokentx',
        contractaddress: usdcAddress,
        page: 1,
        offset: 100,
        sort: 'desc',
        apikey: apiKey,
      },
      timeout: 10000,
    });
    
    console.log(`   状态: ${txResponse.data.status}`);
    console.log(`   消息: ${txResponse.data.message}`);
    
    if (txResponse.data.status === '1') {
      const txs = txResponse.data.result;
      console.log(`   ✅ 找到 ${txs.length} 条交易\n`);
      
      console.log('   📋 最近的 10 条交易:');
      for (const tx of txs.slice(0, 10)) {
        const from = tx.from.slice(0, 10);
        const to = tx.to.slice(0, 10);
        const value = (BigInt(tx.value) / BigInt(10 ** 6)).toString();
        const timestamp = new Date(parseInt(tx.timeStamp) * 1000).toISOString();
        console.log(`      - ${tx.hash.slice(0, 10)}... | ${from}... → ${to}... | ${value} USDC | ${timestamp}`);
      }
    } else {
      console.log(`   ❌ 无法查询交易\n`);
    }

  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

testEtherscanSimple();
