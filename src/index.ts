// @ts-ignore
import { existsSync } from "fs";
// @ts-ignore
import { writeFile } from "fs/promises";
// @ts-ignore
import { homedir } from "os";
// @ts-ignore
import { join } from "path";
import { initConfig, initDir } from "./utils";
import { createServer } from "./server";
import { router } from "./utils/router";
import { apiKeyAuth } from "./middleware/auth";
import {
  cleanupPidFile,
  isServiceRunning,
  savePid,
} from "./utils/processCheck";
import { keyManagerService } from "./services/KeyManagerService";

// 声明全局变量
declare var process: any;

const CONFIG_FILE = 'config.json';

async function initializeClaudeConfig() {
  const homeDir = homedir();
  const configPath = join(homeDir, ".claude.json");
  if (!existsSync(configPath)) {
    const userID = Array.from(
      { length: 64 },
      () => Math.random().toString(16)[2]
    ).join("");
    const configContent = {
      numStartups: 184,
      autoUpdaterStatus: "enabled",
      userID,
      hasCompletedOnboarding: true,
      lastOnboardingVersion: "1.0.17",
      projects: {},
    };
    await writeFile(configPath, JSON.stringify(configContent, null, 2));
  }
}

interface RunOptions {
  port?: number;
}

async function run(options: RunOptions = {}) {
  // Check if service is already running
  if (isServiceRunning()) {
    console.log("✅ Service is already running in the background.");
    return;
  }

  await initializeClaudeConfig();
  await initDir();
  const processedConfig = await initConfig();
  
  // Initialize KeyManagerService with all providers and their keys
  keyManagerService.initialize(processedConfig.providers);
  
  let HOST = processedConfig.global.HOST;

  if (processedConfig.global.HOST && !processedConfig.global.APIKEY) {
    HOST = "127.0.0.1";
    console.warn(
      "⚠️ API key is not set. HOST is forced to 127.0.0.1."
    );
  }

  const port = options.port || 3456;

  // Save the PID of the background process
  savePid(process.pid);

  // Handle SIGINT (Ctrl+C) to clean up PID file
  process.on("SIGINT", () => {
    console.log("Received SIGINT, cleaning up...");
    cleanupPidFile();
    process.exit(0);
  });

  // Handle SIGTERM to clean up PID file
  process.on("SIGTERM", () => {
    cleanupPidFile();
    process.exit(0);
  });
  console.log(HOST)

  // Use port from environment variable if set (for background process)
  const servicePort = process.env.SERVICE_PORT
    ? parseInt(process.env.SERVICE_PORT)
    : port;
  
  // Let @musistudio/llms read original config, but pass providers to initialConfig
  const server = createServer({
    jsonPath: CONFIG_FILE,
    initialConfig: {
      providers: processedConfig.providers, // Pass full provider config
      HOST: HOST,
      PORT: servicePort,
      LOG_FILE: join(
        homedir(),
        ".claude-code-rock",
        "claude-code-rock.log"
      ),
    },
  });

  // Register a single route to handle all proxied requests
  server.app.post('/v1/messages', {
    preHandler: apiKeyAuth(processedConfig.global),
    handler: (req: any, reply: any) => router(req, reply, processedConfig, server.app._server)
  });
  
  try {
    await server.start();
    console.log(`🚀 Claude Code Rock service started successfully on ${HOST}:${servicePort}`);
    
    // The service is started and will continue to run
  } catch (error) {
    console.error("Failed to start service:", error);
    cleanupPidFile();
    process.exit(1);
  }
}

export { run };
