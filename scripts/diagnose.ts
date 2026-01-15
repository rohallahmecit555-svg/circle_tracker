import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../server/eventListener';

async function diagnose() {
  console.log('🔍 开始诊断 Circle Tracker 数据捕获系统...\n');

  for (const [chainKey, chain] of Object.entries(SUPPORTED_CHAINS)) {
    console.log(`\n📍 检查链: ${chain.name} (ID: ${chain.id})`);
    console.log(`   RPC: ${chain.rpcUrl}`);

    try {
      // 1. 测试 RPC 连接
      console.log('   ⏳ 测试 RPC 连接...');
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      console.log(`   ✅ RPC 连接成功，当前区块: ${blockNumber}`);

      // 2. 获取 USDC 合约信息
      console.log(`   ⏳ 查询 USDC 合约 (${chain.usdc})...`);
      const usdcAbi = [
        'function decimals() public view returns (uint8)',
        'function totalSupply() public view returns (uint256)',
        'function balanceOf(address) public view returns (uint256)',
      ];
      const usdcContract = new ethers.Contract(chain.usdc, usdcAbi, provider);
      
      try {
        const decimals = await usdcContract.decimals();
        const totalSupply = await usdcContract.totalSupply();
        console.log(`   ✅ USDC 合约信息:`);
        console.log(`      - Decimals: ${decimals}`);
        console.log(`      - Total Supply: ${(totalSupply / BigInt(10 ** decimals)).toString()}`);
      } catch (error) {
        console.log(`   ⚠️  无法读取 USDC 合约信息`);
      }

      // 3. 查询最近的 Transfer 事件
      console.log(`   ⏳ 查询最近 1000 个区块的 Transfer 事件...`);
      const fromBlock = Math.max(0, blockNumber - 1000);
      const toBlock = blockNumber;
      
      const filter = {
        address: chain.usdc,
        topics: [ethers.id('Transfer(address,address,uint256)')],
        fromBlock,
        toBlock,
      };

      const logs = await provider.getLogs(filter);
      console.log(`   ✅ 找到 ${logs.length} 条 Transfer 事件`);

      if (logs.length > 0) {
        console.log(`   📋 最近的 5 条事件:`);
        const recentLogs = logs.slice(-5);
        for (const log of recentLogs) {
          console.log(`      - TX: ${log.transactionHash.slice(0, 10)}... Block: ${log.blockNumber}`);
        }
      }

      // 4. 检查 CCTP 合约
      console.log(`   ⏳ 检查 CCTP 合约 (${chain.cctp})...`);
      try {
        const code = await provider.getCode(chain.cctp);
        if (code !== '0x') {
          console.log(`   ✅ CCTP 合约存在`);
          
          // 查询 DepositForBurn 事件
          const ccptFilter = {
            address: chain.cctp,
            topics: [ethers.id('DepositForBurn(uint64,address,uint256,address,bytes32,uint32,address)')],
            fromBlock,
            toBlock,
          };
          
          const ccptLogs = await provider.getLogs(ccptFilter);
          console.log(`   ✅ 找到 ${ccptLogs.length} 条 DepositForBurn 事件`);
        } else {
          console.log(`   ⚠️  CCTP 合约不存在或地址错误`);
        }
      } catch (error) {
        console.log(`   ⚠️  无法检查 CCTP 合约: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.log(`   ❌ 错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n✅ 诊断完成！');
}

diagnose().catch(console.error);
