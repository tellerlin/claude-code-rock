#!/usr/bin/env node
import { run } from "./index";
import { showStatus, showDetailedRotationStatus } from "./utils/status";
import { executeCodeCommand } from "./utils/codeCommand";
import { cleanupPidFile, isServiceRunning } from "./utils/processCheck";
import { showVersionInfo, showUpdatePrompt, shouldShowUpdatePrompt } from "./utils/versionCheck";
const version = require(require('path').join(__dirname, '../package.json')).version;
import { spawn } from "child_process";
import { PID_FILE, REFERENCE_COUNT_FILE } from "./constants";
import { existsSync, readFileSync } from "fs";
import {join} from "path";

const command = process.argv[2];

const HELP_TEXT = `
Usage: cco [command]

Commands:
  start         Start service 
  stop          Stop service
  status        Show service status
  rotation      Show API key rotation status
  code          Execute code command
  test          Test all models and API keys in config.json
  setup         Initialize configuration (calls scripts/setup-config.js)
  -v, version   Show version information
  -h, help      Show help information

Example:
  cco start
  cco code "Write a Hello World"
  cco rotation  # Show detailed API key rotation status
  cco test      # Test all models and API keys in config.json
`;

async function waitForService(
  timeout = 30000,
  initialDelay = 2000
): Promise<boolean> {
  // Wait for an initial period to let the service initialize
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (isServiceRunning()) {
      // Wait for an additional short period to ensure service is fully ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function startServiceInBackground(): Promise<boolean> {
  // Check if service is already running
  if (isServiceRunning()) {
    console.log("✅ Service is already running in the background.");
    return true;
  }

  const cliPath = join(__dirname, "cli.js");
  const startProcess = spawn("node", [cliPath, "_internal_start"], {
    detached: true,
    stdio: "ignore",
  });

  startProcess.on("error", (error) => {
    console.error("Failed to start service:", error);
    return false;
  });

  startProcess.unref();

  console.log("🚀 Starting Claude Code Rock service...");
  
  if (await waitForService()) {
    console.log("✅ Service started successfully and running in background.");
    return true;
  } else {
    console.error("❌ Service startup timeout. Check logs for details.");
    return false;
  }
}

async function main() {
  // Show version info and update prompt for all commands except help and version
  if (command !== "-h" && command !== "help" && command !== "-v" && command !== "version") {
    showVersionInfo();
    if (shouldShowUpdatePrompt()) {
      showUpdatePrompt();
    }
  }
  
  switch (command) {
    case "start":
      const started = await startServiceInBackground();
      if (!started) {
        process.exit(1);
      }
      break;
    case "_internal_start":
      // 内部命令，用于后台启动实际服务
      run();
      break;
    case "stop":
      try {
        const pid = parseInt(readFileSync(PID_FILE, "utf-8"));
        process.kill(pid);
        cleanupPidFile();
        if (existsSync(REFERENCE_COUNT_FILE)) {
          try {
            require("fs").unlinkSync(REFERENCE_COUNT_FILE);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        console.log(
          "Claude Code Rock service has been successfully stopped."
        );
      } catch (e) {
        console.log(
          "Failed to stop the service. It may have already been stopped."
        );
        cleanupPidFile();
      }
      break;
    case "status":
      showStatus();
      break;
    case "rotation":
      showDetailedRotationStatus();
      break;
    case "code":
      if (!isServiceRunning()) {
        console.log("Service not running, starting service...");
        const started = await startServiceInBackground();
        if (started) {
          executeCodeCommand(process.argv.slice(3));
        } else {
          console.error("Failed to start service for code command");
          process.exit(1);
        }
      } else {
        executeCodeCommand(process.argv.slice(3));
      }
      break;
    case "test":
      const scriptPath = join(__dirname, "../scripts/cco-test.js");
      spawn("node", [scriptPath], { stdio: "inherit" });
      break;
    case "setup":
      const setupPath = join(__dirname, "../scripts/setup-config.js");
      spawn("node", [setupPath], { stdio: "inherit" });
      break;
    case "-v":
    case "version":
      showVersionInfo();
      break;
    case "-h":
    case "help":
    default:
      console.log(HELP_TEXT);
      break;
  }
}

main();
