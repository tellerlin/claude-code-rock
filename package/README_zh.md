# Claude Code Rock

> 一款强大的工具，可将 Claude Code 请求路由到不同的模型，并自定义任何请求。

## 📋 Fork 信息

这是 [musistudio/claude-code-rock](https://github.com/musistudio/claude-code-rock) 的 Fork 版本，新增了 **API Key 轮询** 功能。

### 🆕 本 Fork 新增功能

- **API Key 轮询**: 支持多个 API Key 的自动轮询
- **多种轮询策略**: round_robin、random、weighted、least_used
- **智能错误处理**: 自动重试、失败计数、冷却机制
- **状态监控**: 实时监控 API Key 轮询状态
- **向后兼容**: 所有原始功能保持不变

### 🔗 相关链接

- **原始项目**: [musistudio/claude-code-rock](https://github.com/musistudio/claude-code-rock)
- **本 Fork**: [tellerlin/claude-code-rock](https://github.com/tellerlin/claude-code-rock)

![](blog/images/claude-code.png)

## ✨ 功能

### 原始功能
-   **模型路由**: 根据您的需求将请求路由到不同的模型（例如，后台任务、思考、长上下文）。
-   **多提供商支持**: 支持 OpenRouter、DeepSeek、Ollama、Gemini、Volcengine 和 SiliconFlow 等各种模型提供商。
-   **请求/响应转换**: 使用转换器为不同的提供商自定义请求和响应。
-   **动态模型切换**: 在 Claude Code 中使用 `/model` 命令动态切换模型。
-   **GitHub Actions 集成**: 在您的 GitHub 工作流程中触发 Claude Code 任务。
-   **插件系统**: 使用自定义转换器扩展功能。

### 🆕 本 Fork 新增功能
-   **API Key 轮询**: 支持多个 API Key 的自动轮询和负载均衡
-   **多种轮询策略**: round_robin、random、weighted、least_used
-   **智能错误处理**: 自动重试、失败计数、冷却机制
-   **状态监控**: 通过 `ccr rotation` 命令实时监控 API Key 轮询状态

## 🚀 快速开始

### 1. 安装

首先，请确保您已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/quickstart)：

```shell
npm install -g @anthropic-ai/claude-code
```

然后，安装 Claude Code Rock：

```shell
npm install -g @tellerlin/claude-code-rock
```

### 2. 配置

#### 步骤 1: 快速设置（推荐）
```bash
# 使用自动设置命令
ccr setup
```

这将自动创建配置目录并复制模板文件。

#### 步骤 2: 手动设置（替代方案）
如果你喜欢手动设置：

**创建配置目录**
```bash
# 创建配置目录
mkdir -p ~/.claude-code-rock
```

**复制配置模板**
```bash
# 从已安装包中复制轮询配置模板
cp $(npm root -g)/@tellerlin/claude-code-rock/config.example.with-rotation.json ~/.claude-code-rock/config.json
```

该模板默认只启用 Gemini 作为示例。要启用其他 provider，只需去掉对应配置块的注释。

**替代方法（如上述方法无效）：**
```bash
# 查找包位置
npm root -g

# 然后从实际 npm 全局路径复制
cp /usr/local/lib/node_modules/@tellerlin/claude-code-rock/config.example.with-rotation.json ~/.claude-code-rock/config.json
```

#### 步骤 3: 编辑配置文件
```bash
# 用你喜欢的编辑器编辑配置文件
nano ~/.claude-code-rock/config.json
# 或 vim
vim ~/.claude-code-rock/config.json
# 或 VS Code
code ~/.claude-code-rock/config.json
```

#### 步骤 4: 配置你的设置
替换配置文件中的占位符：

1. **替换 API Keys**：将 `"sk-xxx"` 替换为你的实际 API keys（必须写在 `api_keys` 数组中，即使只有一个 key）
2. **更新 provider URL**：确保 `api_base_url` 指向你想要的 provider
3. **设置你的密钥**：将 `"your-secret-key"` 替换为用于身份认证的安全密钥
4. **配置代理**（可选）：如需代理，设置 `PROXY_URL`

#### 步骤 5: 保存并退出
- **nano**：按 `Ctrl+X`，然后 `Y`，再 `Enter`
- **vim**：按 `Esc`，输入 `:wq`，再 `Enter`
- **VS Code**：按 `Ctrl+S` 保存，然后关闭编辑器

#### 配置文件位置
- **路径**：`~/.claude-code-rock/config.json`
- **全局配置**：该配置文件为全局配置，适用于你系统上的所有项目
- **安全提示**：配置文件包含敏感 API Keys，切勿提交到版本控制
- **示例文件**（随包提供）：
  - `config.example.with-rotation.json` - 推荐的 API key 轮询配置模板
- **包位置**：用 `npm root -g` 查找包安装位置

#### 基本配置示例

```json
{
  "PROXY_URL": "http://127.0.0.1:7890",
  "LOG": true,
  "HOST": "0.0.0.0",
  "Providers": [
    {
      "name": "deepseek",
      "api_base_url": "https://api.deepseek.com/chat/completions",
      "api_keys": ["sk-xxx"],
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "transformer": {
        "use": ["deepseek"],
        "deepseek-chat": { "use": ["tooluse"] }
      }
    },
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_keys": ["sk-xxx"],
      "models": [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-3.5-sonnet"
      ],
      "transformer": { "use": ["openrouter"] }
    }
  ],
  "Router": {
    "default": "deepseek,deepseek-chat",
    "background": "ollama,qwen2.5-coder:latest",
    "think": "deepseek,deepseek-reasoner",
    "longContext": "openrouter,google/gemini-2.5-pro-preview"
  },
  "APIKEY_optional": "(可选) 设置此字段以启用全局 API 鉴权。不需要可移除。"
}
```

> **注意：**
> - `APIKEY` 字段为可选。仅当你需要全局 API 鉴权时添加。
> - 所有 provider **必须** 使用 `api_keys`（数组）。即使只有一个 key，也要写在数组中。

### 3. 启动

#### 首次设置
如果这是您第一次运行该工具，它会引导您完成交互式设置：

```bash
ccr code
```

系统将要求您提供：
- 提供商名称
- API 密钥
- 提供商 URL
- 模型名称

#### 正常使用
配置完成后，只需运行：

```bash
ccr code
```

#### 一键测试所有 API Key 和模型
要快速验证所有配置的 API Key 和模型是否可用，可运行：

```bash
ccr test
```

该命令会自动测试 config.json 中所有 Provider 的 model+apikey 组合，并输出详细日志，便于排查。

#### 验证安装
检查一切是否正常：

```bash
# 检查服务状态
ccr status

# 检查版本
ccr -v

# 获取帮助
ccr -h
```

## 🔄 API Key 轮询功能

Claude Code Rock 现在支持多个 API Key 轮询功能，可以自动在多个 API Key 之间切换，提高可用性和负载均衡。

### 配置方式

#### 1. 基本轮询配置
```json
{
  "name": "gemini",
  "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
  "api_keys": ["sk-xxx1", "sk-xxx2", "sk-xxx3"],
  "enable_rotation": true,
  "rotation_strategy": "round_robin",
  "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "transformer": { "use": ["gemini"] }
}
```

#### 2. 高级轮询配置
```json
{
  "name": "gemini",
  "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
  "api_keys": [
    {
      "key": "sk-xxx1",
      "weight": 2,
      "maxFailures": 5,
      "cooldownTime": 60000
    },
    {
      "key": "sk-xxx2",
      "weight": 1,
      "maxFailures": 3,
      "cooldownTime": 30000
    }
  ],
  "enable_rotation": true,
  "rotation_strategy": "weighted",
  "retry_on_failure": true,
  "max_retries": 3,
  "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "transformer": { "use": ["gemini"] }
}
```

#### 3. 完整配置（包含路由规则）
```json
{
  // "APIKEY": "your-access-key",  // 可选：访问控制密钥
  "PROXY_URL": "http://127.0.0.1:7890",
  "LOG": true,
  "HOST": "0.0.0.0",
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
      "api_keys": [
        {
          "key": "sk-xxx1",
          "weight": 2,
          "maxFailures": 5,
          "cooldownTime": 60000
        },
        {
          "key": "sk-xxx2",
          "weight": 1,
          "maxFailures": 3,
          "cooldownTime": 30000
        }
      ],
      "enable_rotation": true,
      "rotation_strategy": "weighted",
      "retry_on_failure": true,
      "max_retries": 3,
      "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
      "transformer": { "use": ["gemini"] }
    }
  ],
  "Router": {
    "default": "gemini,gemini-2.5-pro",
    "background": "gemini,gemini-2.5-flash",
    "think": "gemini,gemini-2.5-pro",
    "longContext": "gemini,gemini-2.5-pro"
  }
}
```

### 轮询策略

- **`round_robin`** (默认): 轮询方式，按顺序使用每个API Key
- **`random`**: 随机选择API Key
- **`weighted`**: 加权轮询，根据权重分配请求
- **`least_used`**: 最少使用优先

### 配置参数说明

- **`api_keys`**: API Key 列表，可以是字符串数组或对象数组
- **`enable_rotation`**: 是否启用轮询功能 (默认: true)
- **`rotation_strategy`**: 轮询策略 (默认: round_robin)
- **`retry_on_failure`**: 失败时是否重试 (默认: true)
- **`max_retries`**: 最大重试次数 (默认: 3)

### 向后兼容性

系统完全支持向后兼容：

- 如果配置了 `api_key`（单个），系统会使用单个API Key模式
- 如果配置了 `api_keys`（多个），系统会启用API Key轮询模式
- 两种模式可以同时存在于不同的提供商中

#### API Key 对象配置
- **`key`**: API Key 字符串
- **`weight`**: 权重，用于加权轮询 (默认: 1)
- **`maxFailures`**: 最大失败次数，超过后禁用该Key
- **`cooldownTime`**: 冷却时间（毫秒），失败后等待时间

### 监控和管理

#### 查看轮询状态
```bash
# 查看基本状态（包含轮询信息）
ccr status

# 查看详细轮询状态
ccr rotation
```

#### 状态信息说明
- **Total Keys**: 总API Key数量
- **Available Keys**: 当前可用的API Key数量
- **Key Status**: 每个API Key的状态
  - ✅ 活跃状态
  - ❌ 禁用状态（超过最大失败次数）
  - 失败次数显示

### 错误处理

- **自动重试**: 当API Key失败时，自动切换到下一个可用的Key
- **失败计数**: 记录每个Key的失败次数
- **冷却机制**: 失败的Key会进入冷却期，避免频繁重试
- **自动恢复**: 成功的请求会重置失败计数

## 🎮 使用方法

### 基本命令

```bash
# 启动服务
ccr start

# 停止服务
ccr stop

# 查看服务状态（包含API Key轮询信息）
ccr status

# 查看详细API Key轮询状态
ccr rotation

# 执行代码命令
ccr code

# 一键测试所有API Key和模型
ccr test

# 查看版本
ccr -v

# 查看帮助
ccr -h
```

### 服务管理

Claude Code Rock 支持后台服务模式：

- **`ccr start`**: 启动后台服务，服务会在端口 3456 上运行
- **`ccr stop`**: 停止后台服务
- **`ccr status`**: 查看服务运行状态和API Key轮询状态
- **`ccr rotation`**: 查看详细的API Key轮询状态，包括每个Key的使用情况和失败次数

### 自动服务启动

当您运行 `ccr code` 时，如果服务未运行，系统会自动启动服务：

```bash
# 如果服务未运行，会自动启动
ccr code "写一个Hello World程序"
```

### 动态模型切换

在 Claude Code 中使用 `/model` 命令切换模型：

```
/model provider_name,model_name
```

示例：
```
/model openrouter,anthropic/claude-3.5-sonnet
/model deepseek,deepseek-reasoner
```

### 传递参数给 Claude Code

Claude Code Rock 支持将任何参数传递给原始的 Claude Code。您可以在 `ccr code` 命令后添加任何 Claude Code 支持的参数：

```bash
# 使用 --dangerously-skip-permissions 参数
ccr code --dangerously-skip-permissions

# 传递其他参数
ccr code --help
ccr code "写一个 Hello World 程序"
```

## 🔧 配置详解

### 全局配置项

- **`APIKEY`** (可选): 设置访问控制密钥，保护服务不被未授权访问。设置后，客户端请求必须在 `Authorization` 请求头 (例如, `Bearer your-access-key`) 或 `x-api-key` 请求头中提供此密钥。如果不设置，服务将只接受本地连接 (127.0.0.1)
- **`PROXY_URL`** (可选): 设置代理服务器地址，例如：`"PROXY_URL": "http://127.0.0.1:7890"`
- **`LOG`** (可选): 启用日志记录，日志文件位于 `$HOME/.claude-code-rock.log`
- **`HOST`** (可选): 设置服务监听地址。如果未设置 `APIKEY`，出于安全考虑，主机地址将强制设置为 `127.0.0.1`，以防止未经授权的访问

### Providers 配置

每个 provider 需配置以下字段：

- **`name`**：唯一 provider 名称
- **`api_base_url`**：API 端点地址
- **`api_keys`**：API key 数组（轮询模式，单 key 也必须写在数组中）
- **`models`**：可用模型列表
- **`transformer`**（可选）：请求/响应转换器

### Router 配置

路由规则定义不同场景使用的模型：

- **`default`**: 默认模型，用于一般任务（使用 gemini-2.5-pro 获得最佳质量）
- **`background`**: 后台任务模型（使用 gemini-2.5-flash 进行更快、更便宜的处理）
- **`think`**: 思考模型，用于推理密集型任务（使用 gemini-2.5-pro 获得更好的推理能力）
- **`longContext`**: 长上下文模型，处理超过 60K token 的对话（使用 gemini-2.5-pro 进行上下文处理）

#### 智能模型选择策略
- **后台任务**（如代码生成、简单问答）→ **gemini-2.5-flash**（更快、更便宜）
- **复杂推理、分析、创意任务** → **gemini-2.5-pro**（更好的质量、更强的能力）
- **长对话、上下文密集型任务** → **gemini-2.5-pro**（更好的上下文理解）

## 🔧 转换器 (Transformers)

转换器用于处理不同提供商 API 的兼容性问题。

### 内置转换器

- **`deepseek`**: 适配 DeepSeek API
- **`gemini`**: 适配 Gemini API
- **`