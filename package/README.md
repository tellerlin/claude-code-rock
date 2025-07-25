# Claude Code Rock

[中文版](README_zh.md)

> A powerful tool to route Claude Code requests to different models and customize any request.

## 📋 Fork Information

This is a fork of [musistudio/claude-code-rock](https://github.com/musistudio/claude-code-rock) with additional **API Key Rotation** functionality.

### 🆕 New Features in This Fork

- **API Key Rotation**: Support for multiple API keys with automatic rotation
- **Multiple Rotation Strategies**: round_robin, random, weighted, least_used
- **Smart Error Handling**: Automatic retry, failure counting, cooldown mechanism
- **Status Monitoring**: Real-time monitoring of API key rotation status
- **Backward Compatibility**: All original features remain unchanged

### 🔗 Links

- **Original Project**: [musistudio/claude-code-rock](https://github.com/musistudio/claude-code-rock)
- **This Fork**: [tellerlin/claude-code-rock](https://github.com/tellerlin/claude-code-rock)

![](blog/images/claude-code.png)

## ✨ Features

### Original Features
-   **Model Routing**: Route requests to different models based on your needs (e.g., background tasks, thinking, long context).
-   **Multi-Provider Support**: Supports various model providers like OpenRouter, DeepSeek, Ollama, Gemini, Volcengine, and SiliconFlow.
-   **Request/Response Transformation**: Customize requests and responses for different providers using transformers.
-   **Dynamic Model Switching**: Switch models on-the-fly within Claude Code using the `/model` command.
-   **GitHub Actions Integration**: Trigger Claude Code tasks in your GitHub workflows.
-   **Plugin System**: Extend functionality with custom transformers.

### 🆕 New Features in This Fork
-   **API Key Rotation**: Support for multiple API keys with automatic rotation and load balancing
-   **Multiple Rotation Strategies**: round_robin, random, weighted, least_used
-   **Smart Error Handling**: Automatic retry, failure counting, cooldown mechanism
-   **Status Monitoring**: Real-time monitoring of API key rotation status via `cco rotation` command

## 🚀 Getting Started

### 1. Installation

First, ensure you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code/quickstart) installed:

```shell
npm install -g @anthropic-ai/claude-code
```

Then, install Claude Code Rock:

```shell
npm install -g @tellerlin/claude-code-rock
```

### 2. Configuration

#### Step 1: Quick Setup (Recommended)
```bash
# Use the automatic setup command
cco setup
```

This will automatically create the configuration directory and copy the template file.

#### Step 2: Manual Setup (Alternative)
If you prefer manual setup:

**Create Configuration Directory**
```bash
# Create the configuration directory
mkdir -p ~/.claude-code-rock
```

**Copy Configuration Template**
```bash
# Copy the rotation configuration template from the installed package
cp $(npm root -g)/@tellerlin/claude-code-rock/config.example.with-rotation.json ~/.claude-code-rock/config.json
```

This template has all providers commented out by default, with only Gemini enabled as an example. To enable a provider, simply remove the `//` comments from the beginning of each line in that provider's configuration block.

**Alternative method (if the above doesn't work):**
```bash
# Find the package location
npm root -g

# Then copy from the specific path (replace with your actual npm global path)
cp /usr/local/lib/node_modules/@tellerlin/claude-code-rock/config.example.with-rotation.json ~/.claude-code-rock/config.json
```

#### Step 3: Edit Configuration File
```bash
# Edit the configuration file with your preferred editor
nano ~/.claude-code-rock/config.json
# or use vim
vim ~/.claude-code-rock/config.json
# or use VS Code
code ~/.claude-code-rock/config.json
```

#### Step 4: Configure Your Settings
Replace the placeholder values in the configuration file:

1. **Replace API Keys**: Replace `"sk-xxx"` with your actual API keys (must be in the `api_keys` array, even if only one key)
2. **Update Provider URLs**: Ensure the `api_base_url` points to your desired provider
3. **Set Your Secret Key**: Replace `"your-secret-key"` with a secure key for authentication
4. **Configure Proxy** (optional): Set `PROXY_URL` if you need to use a proxy

#### Step 5: Save and Exit
- **For nano**: Press `Ctrl+X`, then `Y`, then `Enter`
- **For vim**: Press `Esc`, type `:wq`, then press `Enter`
- **For VS Code**: Press `Ctrl+S` to save, then close the editor

#### Configuration File Location
- **Path**: `~/.claude-code-rock/config.json`
- **Global Configuration**: This configuration file is global and applies to all projects on your system
- **Security Note**: The configuration file contains sensitive API keys and should never be committed to version control
- **Example file** (available in the installed package): 
  - `config.example.with-rotation.json` - Configuration template with API key rotation support (recommended)
- **Package location**: Use `npm root -g` to find where the package is installed

#### Basic Configuration Example

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
  "APIKEY_optional": "(Optional) Set this field to enable global API authentication. Remove this line if not needed."
}
```

> **Note:**
> - The `APIKEY` field is **optional**. Only add it if you want to enable global API authentication for all requests. If not needed, simply remove or ignore this field.
> - All providers **must** use `api_keys` (array). If you only have one key, put it in the array.

### 3. Running

#### First Time Setup
If this is your first time running the tool, it will guide you through an interactive setup:

```bash
cco code
```

The system will ask you to provide:
- Provider name
- API key
- Provider URL
- Model name

#### Normal Usage
After configuration, simply run:

```bash
cco code
```

#### Test All API Keys and Models
To quickly verify all your configured API keys and models are working, use:

```bash
cco test
```

This will automatically test every model+apikey combination in your config.json and print detailed logs for troubleshooting.

#### Verify Installation
To check if everything is working:

```bash
# Check service status
cco status

# Check version
cco -v

# Get help
cco -h
```

## 🔄 API Key Rotation Feature

Claude Code Rock now supports multiple API Key rotation functionality, automatically switching between multiple API Keys to improve availability and load balancing.

### Configuration

#### Basic Rotation Configuration
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

#### Advanced Rotation Configuration
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

#### Complete Configuration with Router Rules

```json
{
  // "APIKEY": "your-access-key",  // Optional: Access control key
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

### Rotation Strategies

- **`round_robin`** (default): Round-robin rotation, using each API Key in sequence
- **`random`**: Random selection, suitable for high-concurrency scenarios
- **`weighted`**: Weighted rotation, supporting different weights for API Keys
- **`least_used`**: Least-used priority, selecting the least recently used Key

### Configuration Parameters

- **`api_keys`**: API Key list, can be string array or object array
- **`enable_rotation`**: Whether to enable rotation (default: true)
- **`rotation_strategy`**: Rotation strategy (default: round_robin)
- **`retry_on_failure`**: Whether to retry on failure (default: true)
- **`max_retries`**: Maximum retry attempts (default: 3)

#### API Key Object Configuration
- **`key`**: API Key string
- **`weight`**: Weight for weighted rotation (default: 1)
- **`maxFailures`**: Maximum failure count before disabling the Key
- **`cooldownTime`**: Cooldown time (milliseconds) after failure

### Backward Compatibility

The system fully supports backward compatibility:

- If `api_key` (single) is configured, the system uses single API Key mode
- If `api_keys` (multiple) is configured, the system enables API Key rotation mode
- Both modes can coexist in different providers

### Monitoring and Management

#### View Rotation Status
```bash
# View basic status (includes rotation information)
cco status

# View detailed rotation status
cco rotation
```

#### Status Information
- **Total Keys**: Total number of API Keys
- **Available Keys**: Number of currently available API Keys
- **Key Status**: Status of each API Key
  - ✅ Active status
  - ❌ Disabled status (exceeded maximum failure count)
  - Failure count display

### Error Handling

- **Automatic Retry**: When an API Key fails, automatically switch to the next available Key
- **Failure Counting**: Record failure count for each Key
- **Cooldown Mechanism**: Failed Keys enter a cooldown period to avoid frequent retries
- **Automatic Recovery**: Successful requests reset failure count

## 🎮 Usage

### Basic Commands

```bash
# Start service
cco start

# Stop service
cco stop

# View service status (includes API Key rotation information)
cco status

# View detailed API Key rotation status
cco rotation

# Execute code command
cco code

# Test all models and API keys in config.json
cco test

# View version
cco -v

# View help
cco -h
```

### Service Management

Claude Code Rock supports background service mode:

- **`cco start`**: Start background service, runs on port 3456
- **`cco stop`**: Stop background service
- **`cco status`**: View service running status and API Key rotation status
- **`cco rotation`**: View detailed API Key rotation status, including usage and failure count for each Key

### Automatic Service Startup

When you run `cco code`, if the service is not running, the system will automatically start it:

```bash
# If service is not running, it will start automatically
cco code "Write a Hello World program"
```

### Dynamic Model Switching

Switch models in Claude Code using the `/model` command:

```
/model provider_name,model_name
```

Examples:
```
/model openrouter,anthropic/claude-3.5-sonnet
/model deepseek,deepseek-reasoner
```

### Passing Parameters to Claude Code

Claude Code Rock supports passing any parameters to the original Claude Code. You can add any Claude Code supported parameters after the `cco code` command:

```bash
# Use --dangerously-skip-permissions parameter
cco code --dangerously-skip-permissions

# Pass other parameters
cco code --help
cco code "Write a Hello World program"
```

## 🔧 Configuration Details

### Global Configuration Items

- **`APIKEY`** (optional): Set access control key to protect the service from unauthorized access. When set, client requests must provide this key in the `Authorization` header (e.g., `Bearer your-access-key`) or `x-api-key` header. If not set, the service will only accept local connections (127.0.0.1)
- **`PROXY_URL`** (optional): Set proxy server address, e.g.: `"PROXY_URL": "http://127.0.0.1:7890"`
- **`LOG`** (optional): Enable logging, log file located at `$HOME/.claude-code-rock.log`
- **`HOST`** (optional): Set service listening address. If `APIKEY` is not set, the host address will be forced to `127.0.0.1` for security reasons to prevent unauthorized access

### Providers Configuration

Each provider needs to configure the following fields:

- **`name`**: Unique provider name
- **`api_base_url`**: API endpoint address
- **`api_keys`**: API keys (rotation mode, array, required even for a single key)
- **`models`**: Available model list
- **`transformer`** (optional): Request/response transformer

### Router Configuration

Routing rules define which model to use for different scenarios:

- **`default`**: Default model for general tasks (uses gemini-2.5-pro for best quality)
- **`background`**: Background task model (uses gemini-2.5-flash for faster, cheaper processing)
- **`think`**: Thinking model for reasoning-intensive tasks (uses gemini-2.5-pro for better reasoning)
- **`longContext`**: Long context model for handling conversations over 60K tokens (uses gemini-2.5-pro for context handling)

#### Smart Model Selection Strategy
- **Background tasks** (like code generation, simple Q&A) → **gemini-2.5-flash** (faster, cheaper)
- **Complex reasoning, analysis, creative tasks** → **gemini-2.5-pro** (better quality, more capable)
- **Long conversations, context-heavy tasks** → **gemini-2.5-pro** (better context understanding)

## 🔧 Transformers

Transformers are used to handle compatibility issues between different provider APIs.

### Built-in Transformers

- **`deepseek`**: Adapts DeepSeek API
- **`gemini`**: Adapts Gemini API
- **`openrouter`**: Adapts OpenRouter API
- **`groq`**: Adapts Groq API
- **`maxtoken`**: Sets maximum token count
- **`tooluse`**: Optimizes tool calls
- **`gemini-cli`** (experimental): Support via Gemini CLI

## 🔍 FAQ

### Q: Does Gemini support multiple API Key rotation?

**A**: **Yes!** Claude Code Rock now fully supports multiple API Key rotation functionality. You can configure it as follows:

#### Basic Rotation Configuration
```json
{
  "name": "gemini",
  "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
  "api_keys": ["sk-xxx1", "sk-xxx2", "sk-xxx3"],
  "enable_rotation": true,
  "rotation_strategy": "round_robin",
  "models": ["gemini-2.5-flash", "gemini-2.5-pro"]
}
```

### Q: How to enable `--dangerously-skip-permissions` parameter?

**A**: Use the following command directly:

```bash
cco code --dangerously-skip-permissions
```

Claude Code Rock passes all parameters directly to the original Claude Code, so it supports all native Claude Code parameters.

### Q: How to view logs?

**A**: Set `"LOG": true` in the configuration file, and the log file will be saved at `$HOME/.claude-code-rock.log`.

### Q: How to reset API Key status?

**A**: The system automatically manages API Key status. Failed Keys will automatically recover after the cooldown period, or you can restart the service to reset all status.

### Q: What rotation strategies are supported?

**A**: 4 rotation strategies are supported:
- **`round_robin`**: Round-robin rotation, using each API Key in sequence
- **`random`**: Random selection of API Keys
- **`weighted`**: Weighted rotation based on weights
- **`least_used`**: Least-used priority, selecting the least recently used Key

## 🛠️ Troubleshooting

### Service Startup Failure

1. **Check Configuration File**:
   ```bash
   # Verify the configuration file exists
   ls -la ~/.claude-code-rock/config.json
   
   # Check JSON syntax
   cat ~/.claude-code-rock/config.json | jq .
   ```

2. **Validate API Keys**:
   ```bash
   # Test your API key with curl (example for DeepSeek)
   curl -X POST "https://api.deepseek.com/chat/completions" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'
   ```

3. **Check Network and Proxy**:
   ```bash
   # Test network connectivity
   ping api.deepseek.com
   
   # Test proxy if configured
   curl --proxy http://127.0.0.1:7890 https://api.deepseek.com
   ```

4. **View Logs**:
   ```bash
   # Enable logging in config.json: "LOG": true
   # Then check the log file
   tail -f ~/.claude-code-rock.log
   ```

5. **Check Port Usage**:
   ```bash
   # Check if port 3456 is occupied
   netstat -tulpn | grep 3456
   # or
   lsof -i :3456
   ```

6. **Test All API Keys and Models**:
   ```bash
   # Use the built-in test command to check all configured API keys and models
   cco test
   ```
   This will help you quickly identify which key or model is failing and provide detailed error logs.

### API Key Rotation Issues

1. **All API Keys unavailable**: Check if API Keys are valid, view failure count and cooldown time
2. **Rotation strategy not working**: Confirm `enable_rotation` is set to `true`
3. **Retry failure**: Check `retry_on_failure` and `max_retries` configuration
4. **Weighted rotation imbalance**: Confirm `weight` values are set correctly

### Model Switching Not Working

1. Confirm model name format is correct: `provider_name,model_name`
2. Check if provider configuration is correct
3. Verify if the model is in the provider's support list

## 🤖 GitHub Actions

Configure in `.github/workflows/claude.yaml`:

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Prepare Environment
        run: |
          curl -fsSL https://bun.sh/install | bash
          mkdir -p $HOME/.claude-code-rock
          cat << 'EOF' > $HOME/.claude-code-rock/config.json
          {
            "log": true,
            "OPENAI_API_KEY": "${{ secrets.OPENAI_API_KEY }}",
            "OPENAI_BASE_URL": "https://api.deepseek.com",
            "OPENAI_MODEL": "deepseek-chat"
          }
          EOF

      - name: Start Claude Code Rock
        run: |
          nohup ~/.bun/bin/bunx @tellerlin/claude-code-rock@latest start &

      - name: Run Claude Code
        uses: anthropics/claude-code-action@beta
        env:
          ANTHROPIC_BASE_URL: http://localhost:3456
        with:
          anthropic_api_key: "any-string-is-ok"
```

## 📖 Further Reading

- **[Project Motivation and How It Works](blog/en/project-motivation-and-how-it-works.md)** - Project background and technical principles
- **[Maybe We Can Do More with the Router](blog/en/maybe-we-can-do-more-with-the-route.md)** - Extended functionality discussion


