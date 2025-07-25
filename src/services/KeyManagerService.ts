
import { log } from '../utils/log';

export type ApiKeyStatus = 'unused' | 'active' | 'failed';

export interface ApiKeyRecord {
  key: string;
  providerName: string;
  status: ApiKeyStatus;
  successCount: number;
  failureCount: number;
  lastUsedTimestamp: number;
  lastFailedTimestamp: number;
}

const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_FAILURES = 3;

class KeyManagerService {
  private static instance: KeyManagerService;
  private keyPool: Map<string, ApiKeyRecord> = new Map();

  private constructor() {}

  public static getInstance(): KeyManagerService {
    if (!KeyManagerService.instance) {
      KeyManagerService.instance = new KeyManagerService();
    }
    return KeyManagerService.instance;
  }

  public initialize(providers: any[]): void {
    this.keyPool.clear();
    providers.forEach(provider => {
      if (provider.api_keys && Array.isArray(provider.api_keys)) {
        provider.api_keys.forEach((key: string) => {
          if (key && !this.keyPool.has(key)) {
            this.keyPool.set(key, {
              key,
              providerName: provider.name,
              status: 'unused',
              successCount: 0,
              failureCount: 0,
              lastUsedTimestamp: 0,
              lastFailedTimestamp: 0,
            });
          }
        });
      }
    });
    log(`KeyManagerService initialized with ${this.keyPool.size} keys.`);
  }

  public selectKey(providerName: string): ApiKeyRecord | null {
    const now = Date.now();
    const availableKeys = Array.from(this.keyPool.values()).filter(
      k => k.providerName === providerName
    );

    if (availableKeys.length === 0) {
      return null;
    }
    
    // 1. Prioritize unused keys
    const unusedKeys = availableKeys.filter(k => k.status === 'unused');
    if (unusedKeys.length > 0) {
      return unusedKeys[0];
    }

    // 2. Prioritize active keys, sorted by last used time
    const activeKeys = availableKeys
      .filter(k => k.status === 'active')
      .sort((a, b) => a.lastUsedTimestamp - b.lastUsedTimestamp);
    if (activeKeys.length > 0) {
      return activeKeys[0];
    }
    
    // 3. Try failed keys that have passed their cooldown period
    const cooledDownKeys = availableKeys
      .filter(k => k.status === 'failed' && (now - k.lastFailedTimestamp > COOLDOWN_PERIOD_MS))
      .sort((a, b) => a.lastFailedTimestamp - b.lastFailedTimestamp);

    if (cooledDownKeys.length > 0) {
      log(`Re-trying a cooled-down key for provider ${providerName}.`);
      return cooledDownKeys[0];
    }
    
    // No keys available
    return null;
  }

  public reportSuccess(apiKey: string): void {
    const record = this.keyPool.get(apiKey);
    if (record) {
      record.status = 'active';
      record.successCount++;
      record.failureCount = 0; // Reset failure count on success
      record.lastUsedTimestamp = Date.now();
      log(`Key ${this.getShortKey(apiKey)} reported success.`);
    }
  }

  public reportFailure(apiKey: string): void {
    const record = this.keyPool.get(apiKey);
    if (record) {
      record.failureCount++;
      record.lastFailedTimestamp = Date.now();
      record.lastUsedTimestamp = Date.now();
      if (record.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        record.status = 'failed';
        log(`Key ${this.getShortKey(apiKey)} has been marked as failed after ${record.failureCount} consecutive failures.`);
      } else {
        log(`Key ${this.getShortKey(apiKey)} reported failure. Consecutive failures: ${record.failureCount}`);
      }
    }
  }
  
  public getStatus(): Record<string, ApiKeyRecord[]> {
    const statusByProvider: Record<string, ApiKeyRecord[]> = {};
    this.keyPool.forEach(record => {
      if (!statusByProvider[record.providerName]) {
        statusByProvider[record.providerName] = [];
      }
      statusByProvider[record.providerName].push(record);
    });
    return statusByProvider;
  }

  private getShortKey(key: string): string {
    return key.length > 8 ? `...${key.slice(-4)}` : key;
  }
}

export const keyManagerService = KeyManagerService.getInstance();
