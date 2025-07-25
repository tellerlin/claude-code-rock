
import { existsSync, readFileSync } from 'fs';
import { CONFIG_FILE, PID_FILE, LOG_FILE } from '../constants';
import { isServiceRunning, cleanupPidFile } from './processCheck';
import { keyManagerService } from '../services/KeyManagerService';
import { ApiKeyRecord, ApiKeyStatus } from '../services/KeyManagerService';

function formatTimestamp(timestamp: number): string {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString();
}

function getStatusSymbol(status: ApiKeyStatus): string {
    switch(status) {
        case 'active': return '✅';
        case 'unused': return '🆕';
        case 'failed': return '❌';
        default: return '❓';
    }
}

export function showStatus() {
    console.log(`claude-code-rock status`);
    console.log('-------------------------');
    console.log(`Config file: ${CONFIG_FILE}`);

    if (!isServiceRunning()) {
        console.log('Service status: 🔴 Stopped');
        cleanupPidFile();
        return;
    }

    try {
        const pid = readFileSync(PID_FILE, 'utf-8');
        console.log(`Service status: 🟢 Running (PID: ${pid})`);
        console.log(`Log file: ${LOG_FILE}`);
        // Since the service is running, the key manager should be initialized.
        // We call the detailed status function directly.
        showDetailedRotationStatus();
    } catch (e) {
        console.log('Service status: 🔴 Stopped (PID file not found)');
        cleanupPidFile();
    }
}

export function showDetailedRotationStatus() {
    const rotationStatus = keyManagerService.getStatus();
    const providers = Object.keys(rotationStatus);

    if (providers.length === 0) {
        console.log("\nKey rotation status is not available. Ensure providers and api_keys are configured in your config file and the service is running.");
        return;
    }

    console.log("\n🔑 API Key Rotation Status:\n");

    providers.forEach(providerName => {
        const keys = rotationStatus[providerName];
        const now = Date.now();
        const availableKeys = keys.filter(k => k.status !== 'failed' || (now - k.lastFailedTimestamp > 5 * 60 * 1000));

        console.log(`🔹 Provider: ${providerName}`);
        console.log(`   Available/Total Keys: ${availableKeys.length}/${keys.length}`);
        
        keys.forEach(key => {
            const statusSymbol = getStatusSymbol(key.status);
            console.log(
                `   ${statusSymbol} Key ...${key.key.slice(-4)} | ` +
                `Status: ${key.status.padEnd(8)}| ` +
                `Success: ${key.successCount} | ` +
                `Failures: ${key.failureCount} | ` +
                `Last Used: ${formatTimestamp(key.lastUsedTimestamp)}`
            );
        });
        console.log(''); // Add a blank line for readability
    });
}
