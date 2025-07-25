import fs from "node:fs/promises";
import readline from "node:readline";
import {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  HOME_DIR,
  PLUGINS_DIR,
} from "../constants";
import { processConfig, validateConfig } from "./configProcessor";

const ensureDir = async (dir_path: string) => {
  try {
    await fs.access(dir_path);
  } catch {
    await fs.mkdir(dir_path, { recursive: true });
  }
};

export const initDir = async () => {
  await ensureDir(HOME_DIR);
  await ensureDir(PLUGINS_DIR);
};

const createReadline = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
};

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = createReadline();
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const confirm = async (query: string): Promise<boolean> => {
  const answer = await question(query);
  return answer.toLowerCase() !== "n";
};

export const readConfigFile = async () => {
  try {
    const config = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsedConfig = JSON.parse(config);
    
    // 验证配置
    const errors = validateConfig(parsedConfig);
    if (errors.length > 0) {
      console.error("Configuration validation errors:");
      errors.forEach(error => console.error(`  - ${error}`));
      throw new Error("Invalid configuration");
    }
    
    return parsedConfig;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 配置文件不存在
      console.error("❌ Configuration file not found!");
      console.error(`   Expected location: ${CONFIG_FILE}`);
      console.error("");
      console.error("📝 Please create the configuration file first:");
      console.error("   1. Run: ccr-setup (recommended)");
      console.error("   2. Or manually create the config file:");
      console.error(`      mkdir -p ~/.claude-code-rock`);
      console.error(`      cp $(npm root -g)/@tellerlin/claude-code-rock/config.example.with-rotation.json ~/.claude-code-rock/config.json`);
      console.error("");
      console.error("🔧 Then edit the config file with your API keys and run ccr code again.");
      process.exit(1);
    } else {
      // 其他错误（如JSON解析错误）
      console.error("❌ Failed to read configuration file:");
      console.error(`   ${error.message}`);
      console.error("");
      console.error("🔧 Please check your configuration file format and try again.");
      process.exit(1);
    }
  }
};

export const writeConfigFile = async (config: any) => {
  await ensureDir(HOME_DIR);
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
};

export const initConfig = async () => {
  const config = await readConfigFile();
  
  // 处理配置，初始化API Key轮询系统
  const processedConfig = processConfig(config);
  
  // 将处理后的配置合并到环境变量
  Object.assign(process.env, config);
  
  return processedConfig;
};
