import { isServiceRunning, cleanupPidFile, getReferenceCount } from './processCheck';
import { readFileSync } from 'fs';
import { HOME_DIR } from '../constants';
import { join } from 'path';

export async function closeService() {
    const PID_FILE = join(HOME_DIR, '.claude-code-rock.pid');
    
    if (!isServiceRunning()) {
        console.log("No service is currently running.");
        return;
    }

    if (getReferenceCount() > 0) {
        return;
    }

    try {
        const pid = parseInt(readFileSync(PID_FILE, 'utf-8'));
        process.kill(pid);
        cleanupPidFile();
        console.log("Claude Code Rock service has been successfully stopped.");
    } catch (e) {
        console.log("Failed to stop the service. It may have already been stopped.");
        cleanupPidFile();
    }
}
