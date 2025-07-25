#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import process from 'process';

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');

interface Provider {
  name: string;
  api_base_url: string;
  api_key?: string;
  api_keys?: (string | { key: string })[];
  models: string[];
}

function loadConfig(): any {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function getApiKeys(provider: Provider): string[] {
  if (provider.api_keys) {
    return provider.api_keys.map(k => typeof k === 'string' ? k : k.key);
  }
  if (provider.api_key) {
    return [provider.api_key];
  }
  return [];
}

function getTestEndpoint(provider: Provider, model: string): { url: string; method: string; body?: any; headers: Record<string, string> } {
  // 针对主流API风格自动适配
  if (provider.api_base_url.includes('openai') || provider.api_base_url.includes('deepseek') || provider.api_base_url.includes('openrouter')) {
    // OpenAI/DeepSeek/OpenRouter风格
    return {
      url: provider.api_base_url.replace(/\/$/, '') + '/chat/completions',
      method: 'POST',
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }] }),
      headers: { 'Content-Type': 'application/json' }
    };
  } else if (provider.api_base_url.includes('generativelanguage.googleapis.com')) {
    // Gemini风格
    return {
      url: provider.api_base_url.replace(/\/$/, '') + `/${model}:generateContent`,
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      headers: { 'Content-Type': 'application/json' }
    };
  } else {
    // 默认尝试 /v1/models
    return {
      url: provider.api_base_url.replace(/\/$/, '') + '/v1/models',
      method: 'GET',
      headers: { }
    };
  }
}

async function testProviderModelKey(provider: Provider, model: string, apiKey: string) {
  const { url, method, body, headers } = getTestEndpoint(provider, model);
  // 自动适配主流API的鉴权方式
  if (provider.api_base_url.includes('openai') || provider.api_base_url.includes('deepseek') || provider.api_base_url.includes('openrouter')) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.api_base_url.includes('generativelanguage.googleapis.com')) {
    headers['x-goog-api-key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    if (res.ok) {
      console.log(`[SUCCESS] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0,8)}... | ${res.status} ${res.statusText} (${Date.now()-start}ms)`);
    } else {
      console.error(`[FAIL] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0,8)}... | ${res.status} ${res.statusText}`);
      console.error(`  URL: ${url}`);
      console.error(`  Request: ${body || ''}`);
      console.error(`  Response: ${text}`);
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, json, text };
  } catch (err: any) {
    console.error(`[ERROR] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0,8)}...`);
    console.error(`  URL: ${url}`);
    console.error(`  Request: ${body || ''}`);
    console.error(`  Error: ${err.stack || err}`);
    return { ok: false, error: err };
  }
}

async function main() {
  const config = loadConfig();
  const providers: Provider[] = config.Providers || config.providers || [];
  if (providers.length === 0) {
    console.error('No Providers found in config.json');
    process.exit(1);
  }
  for (const provider of providers) {
    const apiKeys = getApiKeys(provider);
    if (!apiKeys.length) {
      console.warn(`Provider ${provider.name} has no API keys, skipped.`);
      continue;
    }
    for (const model of provider.models) {
      for (const apiKey of apiKeys) {
        await testProviderModelKey(provider, model, apiKey);
      }
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
}); 