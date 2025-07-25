// Simple version check utility without additional dependencies
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const VERSION_FILE = path.join(os.homedir(), '.claude-code-rock', '.version-check');

export function getCurrentVersion(): string {
  try {
    // 兼容 esbuild bundle，使用 require 方式
    const pkg = require('../../package.json');
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

export function getLatestVersion(): string | null {
  try {
    const result = execSync('npm view @tellerlin/claude-code-rock version', { 
      encoding: 'utf8',
      timeout: 5000 
    });
    return result.trim();
  } catch {
    return null;
  }
}

export function shouldShowUpdatePrompt(): boolean {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      return true;
    }
    
    const lastCheck = fs.readFileSync(VERSION_FILE, 'utf8').trim();
    const currentTime = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Show prompt if last check was more than 24 hours ago
    return (currentTime - parseInt(lastCheck)) > oneDay;
  } catch {
    return true;
  }
}

export function markUpdatePromptShown(): void {
  try {
    const dir = path.dirname(VERSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VERSION_FILE, Date.now().toString());
  } catch {
    // Ignore errors
  }
}

export function checkForUpdates(): { current: string; latest: string | null; shouldUpdate: boolean } {
  const current = getCurrentVersion();
  const latest = getLatestVersion();
  
  if (!latest) {
    return { current, latest: null, shouldUpdate: false };
  }
  
  const shouldUpdate = current !== latest;
  
  return { current, latest, shouldUpdate };
}

export function showVersionInfo(): void {
  const current = getCurrentVersion();
  console.log(`🚀 Claude Code Rock v${current}`);
}

export function showUpdatePrompt(): void {
  const { current, latest, shouldUpdate } = checkForUpdates();
  
  if (shouldUpdate && latest) {
    console.log(`\n📦 Update available: v${current} → v${latest}`);
    console.log(`💡 Run 'npm install -g @tellerlin/claude-code-rock@latest' to update\n`);
    markUpdatePromptShown();
  }
} 