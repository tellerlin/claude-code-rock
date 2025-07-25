declare var process: any;
/**
 * 配置处理器
 * 用于处理API Key轮询配置并初始化轮询系统
 */

import { apiKeyRotationTransformer, ApiKeyRotationConfig } from './apiKeyRotationTransformer';
import { log } from './log';
import { CONFIG_FILE } from '../constants';
import { existsSync, readFileSync } from 'fs';

export interface ProviderConfig {
  name: string;
  api_base_url: string;
  api_keys?: string[] | Array<{
    key: string;
    weight?: number;
    maxFailures?: number;
    cooldownTime?: number;
  }>; // 新的多API Key配置
  models: string[];
  transformer?: any;
  // API Key轮询配置
  enable_rotation?: boolean;
  rotation_strategy?: 'round_robin' | 'random' | 'weighted' | 'least_used';
  retry_on_failure?: boolean;
  max_retries?: number;
}

export interface ProcessedConfig {
  providers: ProviderConfig[];
  router: any;
  global: any;
}

/**
 * 处理配置文件，初始化API Key轮询系统
 */
export function processConfig(config: any): ProcessedConfig {
  const processedConfig: ProcessedConfig = {
    providers: [],
    router: config.Router || {},
    global: {
      APIKEY: config.APIKEY,
      PROXY_URL: config.PROXY_URL,
      LOG: config.LOG,
      HOST: config.HOST
    }
  };

  // 自动兼容 llms 代理机制
  if (config.PROXY_URL && !(process as any).env.HTTPS_PROXY && !(process as any).env.https_proxy) {
    if (config.PROXY_URL.startsWith('socks')) {
      console.warn('⚠️  WARNING: Main service does not support socks5 proxy!');
      console.warn('⚠️  Only test script (cco test) supports socks5 proxy.');
      console.warn('⚠️  For main service, please use HTTP proxy or set up HTTP proxy forwarding.');
      console.warn(`⚠️  Current socks5 proxy: ${config.PROXY_URL}`);
      console.warn('⚠️  You can:');
      console.warn('⚠️  1. Use an HTTP proxy instead');
      console.warn('⚠️  2. Set up HTTP-to-socks5 forwarding (e.g., with Privoxy)');
      console.warn('⚠️  3. Use a VPN or direct connection for main service');
    } else {
      (process as any).env.HTTPS_PROXY = config.PROXY_URL;
      console.log(`[INFO] Set HTTPS_PROXY for main service: ${config.PROXY_URL}`);
    }
  }

  // 处理providers配置
  const providers = config.Providers || config.providers || [];
  
  for (const provider of providers) {
    const processedProvider = processProviderConfig(provider);
    processedConfig.providers.push(processedProvider);
    
    // 初始化API Key轮询
    initializeApiKeyRotation(processedProvider);
  }

  return processedConfig;
}

/**
 * 处理单个provider配置
 */
function processProviderConfig(provider: any): ProviderConfig {
  const processedProvider: ProviderConfig = {
    name: provider.name,
    api_base_url: provider.api_base_url,
    models: provider.models || [],
    transformer: provider.transformer
  };

  // 只支持轮询配置
  if (provider.api_keys) {
    processedProvider.api_keys = provider.api_keys;
    processedProvider.enable_rotation = provider.enable_rotation !== false; // 默认启用
    processedProvider.rotation_strategy = provider.rotation_strategy || 'round_robin';
    processedProvider.retry_on_failure = provider.retry_on_failure !== false; // 默认启用
    processedProvider.max_retries = provider.max_retries || 3;
  } else {
    throw new Error(`Provider ${provider.name} must have 'api_keys' configured`);
  }

  return processedProvider;
}

/**
 * 初始化API Key轮询系统
 */
function initializeApiKeyRotation(provider: ProviderConfig): void {
  if (!provider.enable_rotation || !provider.api_keys) {
    return;
  }

  const rotationConfig: ApiKeyRotationConfig = {
    api_keys: provider.api_keys,
    strategy: provider.rotation_strategy,
    enable_rotation: provider.enable_rotation,
    retry_on_failure: provider.retry_on_failure,
    max_retries: provider.max_retries
  };

  apiKeyRotationTransformer.registerProvider(provider.name, rotationConfig);
  
  log(`Initialized API key rotation for provider: ${provider.name}`);
}

/**
 * 验证配置格式
 */
export function validateConfig(config: any): string[] {
  const errors: string[] = [];

  if (!config.Providers && !config.providers) {
    errors.push('Missing Providers configuration');
    return errors;
  }

  const providers = config.Providers || config.providers || [];
  
  for (const provider of providers) {
    // 检查必需字段
    if (!provider.name) {
      errors.push('Provider missing required field: name');
    }
    
    if (!provider.api_base_url) {
      errors.push(`Provider ${provider.name || 'unknown'} missing required field: api_base_url`);
    }
    
    if (!provider.models || !Array.isArray(provider.models) || provider.models.length === 0) {
      errors.push(`Provider ${provider.name || 'unknown'} missing required field: models`);
    }

    // 只允许 api_keys
    if (!provider.api_keys) {
      errors.push(`Provider ${provider.name || 'unknown'} must have 'api_keys' configured`);
    }

    // 检查API Key轮询配置
    if (provider.api_keys && provider.enable_rotation) {
      if (!Array.isArray(provider.api_keys) || provider.api_keys.length === 0) {
        errors.push(`Provider ${provider.name || 'unknown'} api_keys must be a non-empty array`);
      }

      if (provider.rotation_strategy && !['round_robin', 'random', 'weighted', 'least_used'].includes(provider.rotation_strategy)) {
        errors.push(`Provider ${provider.name || 'unknown'} invalid rotation_strategy: ${provider.rotation_strategy}`);
      }

      if (provider.max_retries && (typeof provider.max_retries !== 'number' || provider.max_retries < 1)) {
        errors.push(`Provider ${provider.name || 'unknown'} max_retries must be a positive number`);
      }
    }
  }

  return errors;
}

/**
 * 获取API Key（支持轮询）
 */
export function getApiKey(providerName: string, provider: ProviderConfig): string {
  if (provider.enable_rotation && provider.api_keys) {
    const rotatedKey = apiKeyRotationTransformer.getApiKey(providerName);
    if (rotatedKey) {
      return rotatedKey;
    }
    // 如果没有可用的轮询密钥，回退到第一个密钥
    const firstKey = Array.isArray(provider.api_keys) && provider.api_keys.length > 0 
      ? (typeof provider.api_keys[0] === 'string' ? provider.api_keys[0] : provider.api_keys[0].key)
      : null;
    if (firstKey) {
      return firstKey;
    }
  }

  throw new Error(`No API key available for provider: ${providerName}`);
}

/**
 * 标记API Key失败
 */
export function markApiKeyFailure(providerName: string, apiKey: string, error?: any): void {
  apiKeyRotationTransformer.markFailure(providerName, apiKey, error);
}

/**
 * 标记API Key成功
 */
export function markApiKeySuccess(providerName: string, apiKey: string): void {
  apiKeyRotationTransformer.markSuccess(providerName, apiKey);
}

/**
 * 获取所有提供商的状态信息
 */
export function getApiKeyRotationStatus(): any[] {
  // 首先尝试从运行时状态获取
  const runtimeStatus = apiKeyRotationTransformer.getAllProviderStatus();
  if (runtimeStatus.length > 0) {
    return runtimeStatus;
  }

  // 如果运行时状态为空，从配置文件读取
  try {
    if (!existsSync(CONFIG_FILE)) {
      return [];
    }

    const configContent = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configContent);
    const providers = config.Providers || config.providers || [];
    
    const configBasedStatus: any[] = [];
    
    for (const provider of providers) {
      if (provider.enable_rotation && provider.api_keys && Array.isArray(provider.api_keys)) {
        configBasedStatus.push({
          provider: provider.name,
          enabled: true,
          strategy: provider.rotation_strategy || 'round_robin',
          totalKeys: provider.api_keys.length,
          availableKeys: provider.api_keys.length, // 假设所有 key 都可用
          keyStatus: provider.api_keys.map((key: any) => ({
            key: typeof key === 'string' ? key : key.key,
            isActive: true,
            failures: 0,
            lastFailureTime: 0,
            lastUsedTime: 0
          }))
        });
      }
    }
    
    return configBasedStatus;
  } catch (error) {
    console.error('Error reading config for rotation status:', error);
    return [];
  }
} 