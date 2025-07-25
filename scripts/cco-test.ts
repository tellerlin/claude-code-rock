#!/usr/bin/env ts-node
// @ts-ignore
import { readFileSync, existsSync } from 'fs';
// @ts-ignore
import { join } from 'path';
// @ts-ignore
import { homedir } from 'os';

// 声明全局变量
declare var process: any;

interface Config {
  PROXY_URL?: string;
  Providers?: Array<{
    name: string;
    api_base_url: string;
    api_keys: string[];
    models: string[];
  }>;
}

interface TestResult {
  provider: string;
  model: string;
  apiKey: string;
  keyTail: string;
  success: boolean;
  status?: string;
  responseTime?: number;
  error?: string;
}

/**
 * 获取 API key 尾号
 */
function getKeyTail(apiKey: string): string {
  if (apiKey.length <= 8) return apiKey;
  return `...${apiKey.slice(-6)}`;
}

/**
 * 测试单个 Provider + Model + API Key 组合
 */
async function testProviderModelKey(
  provider: any,
  model: string,
  apiKey: string
): Promise<TestResult> {
  const keyTail = getKeyTail(apiKey);
  const result: TestResult = {
    provider: provider.name,
    model: model,
    apiKey: apiKey,
    keyTail: keyTail,
    success: false
  };

  const startTime = Date.now();
  
  try {
    const url = `${provider.api_base_url}${model}:generateContent`;

    const fetchOptions: any = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Hello' }]
          }
        ]
      })
    };

    const res = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;
    result.responseTime = responseTime;

    if (res.ok) {
      result.success = true;
      result.status = `${res.status} ${res.statusText}`;
    } else {
      const errorText = await res.text();
      result.status = `${res.status} ${res.statusText}`;
      result.error = errorText.length > 100 ? `${errorText.slice(0, 100)}...` : errorText;
    }
  } catch (error: any) {
    result.responseTime = Date.now() - startTime;
    result.error = error.message || 'Unknown error';
    result.status = 'Network Error';
  }

  return result;
}

/**
 * 主测试函数
 */
async function main() {
  const configPath = join(homedir(), '.claude-code-rock', 'config.json');
  
  if (!existsSync(configPath)) {
    console.error('❌ Config file not found:', configPath);
    process.exit(1);
  }

  let config: Config;
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    process.exit(1);
  }

  // 设置代理 - 现在 config 已经被正确赋值
  if (config && config.PROXY_URL && !process.env.PROXY_URL) {
    process.env.PROXY_URL = config.PROXY_URL;
  }

  if (process.env.PROXY_URL) {
    if (process.env.PROXY_URL.startsWith('socks')) {
      console.error('❌ socks5 proxy not supported in test script!');
      console.error('   Please use HTTP proxy instead');
      process.exit(1);
    } else {
      // 使用 undici ProxyAgent 设置HTTP代理
      let setGlobalDispatcher: any = null;
      let ProxyAgent: any = null;

      async function initializeProxySupport() {
        try {
          const undici = await import('undici');
          setGlobalDispatcher = undici.setGlobalDispatcher;
          ProxyAgent = undici.ProxyAgent;
          return true;
        } catch (error) {
          return false;
        }
      }

      const proxyInitialized = await initializeProxySupport();
      if (proxyInitialized && setGlobalDispatcher && ProxyAgent) {
        try {
          const proxyAgent = new ProxyAgent(process.env.PROXY_URL);
          setGlobalDispatcher(proxyAgent);
        } catch (proxyError: any) {
          console.error('❌ Failed to setup proxy:', proxyError.message);
          process.exit(1);
        }
      }
    }
  }

  const providers = config && config.Providers ? config.Providers : [];
  if (providers.length === 0) {
    console.error('❌ No providers configured');
    process.exit(1);
  }

  console.log('🧪 Testing API keys...\n');

  const results: TestResult[] = [];
  let totalTests = 0;

  // 计算总测试数
  for (const provider of providers) {
    for (const model of provider.models) {
      for (const apiKey of provider.api_keys) {
        totalTests++;
      }
    }
  }

  // 执行测试
  for (const provider of providers) {
    console.log(`📡 Provider: ${provider.name}`);
    
    for (const model of provider.models) {
      console.log(`  🔍 Model: ${model}`);
      
      for (const apiKey of provider.api_keys) {
        const result = await testProviderModelKey(provider, model, apiKey);
        results.push(result);
        
        // 显示每个测试的详细状态
        if (result.success) {
          console.log(`    ✅ Key ${result.keyTail}: ${result.status} (${result.responseTime}ms)`);
        } else {
          console.log(`    ❌ Key ${result.keyTail}: ${result.status}`);
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        }
      }
    }
    console.log(); // 空行分隔不同 provider
  }

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log('📊 Test Summary:');
  console.log(`   ✅ Successful: ${successCount}/${totalTests}`);
  console.log(`   ❌ Failed: ${failureCount}/${totalTests}`);

  // 显示失败的 key 详情
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log('\n🚨 Failed API Keys:');
    failedResults.forEach(result => {
      console.log(`   • ${result.provider}/${result.model} - Key ${result.keyTail}: ${result.status}`);
    });
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   • Check if API keys are valid and not expired');
    console.log('   • Verify network connectivity and proxy settings');
    console.log('   • Ensure API quota/rate limits are not exceeded');
    console.log('   • Check if the provider service is available');
    process.exit(1);
  } else {
    console.log('\n🎉 All API keys are working correctly!');
    console.log('   Your configuration is ready for production use.');
  }
}

main().catch(console.error); 