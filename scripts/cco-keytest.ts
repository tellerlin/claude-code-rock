#!/usr/bin/env ts-node
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import readline from 'readline';
import os from 'os';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODEL = 'gemini-2.5-pro';

function parseKeys(input: string): string[] {
  return Array.from(new Set(
    input
      .split(/[\,\n\r]+/)
      .map(k => k.replace(/^['"]+|['"]+$/g, '').trim())
      .filter(Boolean)
  ));
}

interface TestResult {
  apiKey: string;
  keyTail: string;
  success: boolean;
  status?: string;
  responseTime?: number;
  error?: string;
}

function getKeyTail(apiKey: string): string {
  if (apiKey.length <= 8) return apiKey;
  return `...${apiKey.slice(-6)}`;
}

async function testKey(apiKey: string): Promise<TestResult> {
  const url = `${GEMINI_API_BASE}${GEMINI_MODEL}:generateContent`;
  const keyTail = getKeyTail(apiKey);
  const result: TestResult = {
    apiKey,
    keyTail,
    success: false
  };
  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [ { parts: [{ text: 'Hello' }] } ]
      })
    });
    result.responseTime = Date.now() - startTime;
    result.status = `${res.status} ${res.statusText}`;
    if (res.ok) {
      result.success = true;
    } else {
      const errText = await res.text();
      result.error = errText.length > 100 ? `${errText.slice(0, 100)}...` : errText;
    }
  } catch (err: any) {
    result.responseTime = Date.now() - startTime;
    result.status = 'Network Error';
    result.error = err?.message || String(err);
  }
  return result;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  // 1. 代理配置
  let proxyUrl = '';
  const proxyInput = await prompt('Enter proxy URL (or press Enter to skip): ');
  if (proxyInput && proxyInput.trim()) {
    proxyUrl = proxyInput.trim();
    if (!/^https?:\/\//.test(proxyUrl)) proxyUrl = 'http://' + proxyUrl;
    try {
      const { setGlobalDispatcher, ProxyAgent } = await import('undici');
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      console.log(`Proxy will be used: ${proxyUrl}`);
    } catch (e) {
      console.error('Proxy support requires undici. Please install it with: npm install undici');
      process.exit(1);
    }
  } else {
    console.log('No proxy will be used.');
  }

  // 2. 粘贴key
  console.log('Paste your Gemini API keys (comma, newline, single/double quote supported). End input with an empty line:');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let lines: string[] = [];
  for await (const line of rl) {
    if (line.trim() === '') break;
    lines.push(line);
  }
  rl.close();
  const allKeys = parseKeys(lines.join('\n'));
  if (allKeys.length === 0) {
    console.error('No keys detected.');
    process.exit(1);
  }
  console.log(`\n🧪 Testing ${allKeys.length} keys...\n`);
  const results: TestResult[] = [];
  for (const key of allKeys) {
    const result = await testKey(key);
    results.push(result);
    if (result.success) {
      console.log(`  ✅ Key ${result.keyTail}: ${result.status} (${result.responseTime}ms)`);
    } else {
      console.log(`  ❌ Key ${result.keyTail}: ${result.status}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }
  const validKeys = results.filter(r => r.success).map(r => r.apiKey);
  if (validKeys.length === 0) {
    console.error('\nNo valid keys found.');
    process.exit(2);
  }
  // 3. 生成config
  const config: any = {
    Providers: [
      {
        name: 'gemini',
        api_base_url: GEMINI_API_BASE,
        api_keys: validKeys,
        enable_rotation: true,
        rotation_strategy: 'round_robin',
        retry_on_failure: true,
        max_retries: 3,
        models: [GEMINI_MODEL],
        transformer: { use: ['gemini'] }
      }
    ],
    Router: {
      default: 'gemini,gemini-2.5-pro',
      background: 'gemini,gemini-2.5-pro',
      think: 'gemini,gemini-2.5-pro',
      longContext: 'gemini,gemini-2.5-pro'
    }
  };
  if (proxyUrl) config.PROXY_URL = proxyUrl;
  const homeDir = os.homedir();
  const ccoDir = `${homeDir}/.claude-code-rock`;
  if (!existsSync(ccoDir)) mkdirSync(ccoDir);
  const keyFilePath = `${ccoDir}/valid-key-config.json`;
  writeFileSync(keyFilePath, JSON.stringify(config, null, 2));
  console.log(`\nValid keys written to ${keyFilePath}. You can review and copy to config.json as needed.`);
}

main(); 