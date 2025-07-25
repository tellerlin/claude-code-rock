/**
 * API Key 轮询管理器
 * 支持多种轮询策略：轮询、随机、加权轮询
 */

export interface ApiKeyConfig {
  key: string;
  weight?: number; // 权重，用于加权轮询
  maxFailures?: number; // 最大失败次数
  cooldownTime?: number; // 冷却时间（毫秒）
}

export interface ApiKeyStatus {
  key: string;
  failures: number;
  lastFailureTime: number;
  isActive: boolean;
  lastUsedTime: number;
  // Add new fields for better error tracking
  quotaFailures: number;
  authFailures: number;
  lastQuotaResetTime: number;
  permanentlyDisabled: boolean;
  errorHistory: Array<{
    time: number;
    error: any;
    type: 'quota' | 'auth' | 'other';
  }>;
}

export type RotationStrategy = 'round_robin' | 'random' | 'weighted' | 'least_used';

export class ApiKeyRotator {
  private apiKeys: ApiKeyConfig[];
  private status: Map<string, ApiKeyStatus>;
  private currentIndex: number = 0;
  private strategy: RotationStrategy;
  private readonly MAX_ERROR_HISTORY = 10;

  constructor(apiKeys: string[] | ApiKeyConfig[], strategy: RotationStrategy = 'round_robin') {
    this.apiKeys = this.normalizeApiKeys(apiKeys);
    this.strategy = strategy;
    this.status = new Map();
    
    // Initialize status with enhanced fields
    this.apiKeys.forEach(config => {
      this.status.set(config.key, {
        key: config.key,
        failures: 0,
        lastFailureTime: 0,
        isActive: true,
        lastUsedTime: 0,
        quotaFailures: 0,
        authFailures: 0,
        lastQuotaResetTime: 0,
        permanentlyDisabled: false,
        errorHistory: []
      });
    });
  }

  private normalizeApiKeys(apiKeys: string[] | ApiKeyConfig[]): ApiKeyConfig[] {
    return apiKeys.map(key => {
      if (typeof key === 'string') {
        return { key };
      }
      return key;
    });
  }

  /**
   * 获取下一个可用的API Key
   */
  getNextKey(): string | null {
    const availableKeys = this.getAvailableKeys();
    
    if (availableKeys.length === 0) {
      return null;
    }

    let selectedKey: string;

    switch (this.strategy) {
      case 'round_robin':
        selectedKey = this.roundRobinSelect(availableKeys);
        break;
      case 'random':
        selectedKey = this.randomSelect(availableKeys);
        break;
      case 'weighted':
        selectedKey = this.weightedSelect(availableKeys);
        break;
      case 'least_used':
        selectedKey = this.leastUsedSelect(availableKeys);
        break;
      default:
        selectedKey = this.roundRobinSelect(availableKeys);
    }

    // 更新使用时间
    const status = this.status.get(selectedKey);
    if (status) {
      status.lastUsedTime = Date.now();
    }

    return selectedKey;
  }

  /**
   * Analyze error type
   */
  private analyzeError(error: any): 'quota' | 'auth' | 'other' {
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return 'quota';
    }
    if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid key') || errorMessage.includes('authentication')) {
      return 'auth';
    }
    return 'other';
  }

  /**
   * Enhanced getAvailableKeys with smarter filtering
   */
  private getAvailableKeys(): string[] {
    const now = Date.now();
    return this.apiKeys
      .filter(config => {
        const status = this.status.get(config.key);
        if (!status || status.permanentlyDisabled) return false;
        
        // Skip permanently disabled keys
        if (status.permanentlyDisabled) return false;
        
        // Check quota reset time
        if (status.lastQuotaResetTime > now) return false;
        
        // Skip keys with recent quota failures
        if (status.quotaFailures > 0) {
          const quotaResetWindow = 60000; // 1 minute
          if (now - status.lastFailureTime < quotaResetWindow) return false;
          // Reset quota failures counter after window
          status.quotaFailures = 0;
        }
        
        // Check cooldown time
        if (config.cooldownTime && status.lastFailureTime > 0) {
          const timeSinceFailure = now - status.lastFailureTime;
          if (timeSinceFailure < config.cooldownTime) return false;
        }
        
        return true;
      })
      .map(config => config.key);
  }

  /**
   * 轮询选择
   */
  private roundRobinSelect(availableKeys: string[]): string {
    if (availableKeys.length === 0) throw new Error('No available keys');
    
    const key = availableKeys[this.currentIndex % availableKeys.length];
    this.currentIndex = (this.currentIndex + 1) % availableKeys.length;
    return key;
  }

  /**
   * 随机选择
   */
  private randomSelect(availableKeys: string[]): string {
    if (availableKeys.length === 0) throw new Error('No available keys');
    
    const index = Math.floor(Math.random() * availableKeys.length);
    return availableKeys[index];
  }

  /**
   * 加权选择
   */
  private weightedSelect(availableKeys: string[]): string {
    if (availableKeys.length === 0) throw new Error('No available keys');
    
    const availableConfigs = this.apiKeys.filter(config => 
      availableKeys.includes(config.key)
    );
    
    const totalWeight = availableConfigs.reduce((sum, config) => 
      sum + (config.weight || 1), 0
    );
    
    let random = Math.random() * totalWeight;
    
    for (const config of availableConfigs) {
      const weight = config.weight || 1;
      if (random <= weight) {
        return config.key;
      }
      random -= weight;
    }
    
    // 兜底返回第一个
    return availableKeys[0];
  }

  /**
   * 最少使用选择
   */
  private leastUsedSelect(availableKeys: string[]): string {
    if (availableKeys.length === 0) throw new Error('No available keys');
    
    let leastUsedKey = availableKeys[0];
    let leastUsedTime = this.status.get(leastUsedKey)?.lastUsedTime || 0;
    
    for (const key of availableKeys) {
      const status = this.status.get(key);
      const lastUsedTime = status?.lastUsedTime || 0;
      
      if (lastUsedTime < leastUsedTime) {
        leastUsedKey = key;
        leastUsedTime = lastUsedTime;
      }
    }
    
    return leastUsedKey;
  }

  /**
   * Mark API Key failure with enhanced error tracking
   */
  markFailure(key: string, error?: any): void {
    const status = this.status.get(key);
    if (!status) return;
    
    const errorType = this.analyzeError(error);
    
    // Update error history
    status.errorHistory.unshift({
      time: Date.now(),
      error,
      type: errorType
    });
    
    // Keep only recent errors
    status.errorHistory = status.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    
    // Update failure counters
    status.failures++;
    status.lastFailureTime = Date.now();
    
    if (errorType === 'quota') {
      status.quotaFailures++;
    } else if (errorType === 'auth') {
      status.authFailures++;
    }
    
    // Check for permanent disabling conditions
    const config = this.apiKeys.find(c => c.key === key);
    
    // Permanently disable on authentication failures or excessive failures
    if (errorType === 'auth' || 
        (config?.maxFailures && status.failures >= config.maxFailures * 2)) {
      status.permanentlyDisabled = true;
      status.isActive = false;
    }
    // Temporary disable on quota exceeded
    else if (errorType === 'quota') {
      status.isActive = false;
      status.lastQuotaResetTime = Date.now() + (config?.cooldownTime || 60000);
    }
  }

  /**
   * 标记API Key成功
   */
  markSuccess(key: string): void {
    const status = this.status.get(key);
    if (!status) return;
    
    // 重置失败计数
    status.failures = 0;
    status.lastFailureTime = 0;
    status.isActive = true;
  }

  /**
   * Reset a permanently disabled key (for manual intervention)
   */
  resetKey(key: string): void {
    const status = this.status.get(key);
    if (status) {
      status.permanentlyDisabled = false;
      status.isActive = true;
      status.failures = 0;
      status.quotaFailures = 0;
      status.authFailures = 0;
      status.errorHistory = [];
    }
  }

  /**
   * Get key status information
   */
  getKeyStatus(key: string): ApiKeyStatus | null {
    return this.status.get(key) || null;
  }

  /**
   * 获取所有API Key状态
   */
  getAllStatus(): ApiKeyStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * 获取可用API Key数量
   */
  getAvailableCount(): number {
    return this.getAvailableKeys().length;
  }

  /**
   * Get count of available keys
   */
  getAvailableKeyCount(): number {
    return this.getAvailableKeys().length;
  }

  /**
   * 获取总API Key数量
   */
  getTotalCount(): number {
    return this.apiKeys.length;
  }

  /**
   * 更新轮询策略
   */
  setStrategy(strategy: RotationStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 添加新的API Key
   */
  addApiKey(key: string | ApiKeyConfig): void {
    const config = typeof key === 'string' ? { key } : key;
    this.apiKeys.push(config);
    
    this.status.set(config.key, {
      key: config.key,
      failures: 0,
      lastFailureTime: 0,
      isActive: true,
      lastUsedTime: 0,
      quotaFailures: 0,
      authFailures: 0,
      lastQuotaResetTime: 0,
      permanentlyDisabled: false,
      errorHistory: []
    });
  }

  /**
   * 移除API Key
   */
  removeApiKey(key: string): boolean {
    const index = this.apiKeys.findIndex(config => config.key === key);
    if (index === -1) return false;
    
    this.apiKeys.splice(index, 1);
    this.status.delete(key);
    return true;
  }
}

/**
 * 创建API Key轮询器
 */
export function createApiKeyRotator(
  apiKeys: string[] | ApiKeyConfig[], 
  strategy: RotationStrategy = 'round_robin'
): ApiKeyRotator {
  return new ApiKeyRotator(apiKeys, strategy);
} 