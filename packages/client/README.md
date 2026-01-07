# @mcphub/client

Official MCP Hub client for connecting Claude Desktop (or any MCP client) to the MCP Hub platform.

## Installation

```bash
npx -y @mcphub/client --token YOUR_API_KEY
```

## Usage

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcphub": {
      "command": "npx",
      "args": ["-y", "@mcphub/client", "--token", "YOUR_API_KEY_HERE"]
    }
  }
}
```

### Getting an API Key

1. Sign up at [MCP Hub](https://mcp-app-store.vercel.app)
2. Go to the Dashboard → API Keys
3. Create a new API key
4. Copy the key (starts with `mcp_sk_`)

### Command Line Options

```bash
npx -y @mcphub/client --token <API_KEY> [options]

Options:
  --token <token>       MCP Hub API key (required)
  --gateway-url <url>   Custom gateway URL (optional)
  --version             Display version
  --help                Display help
```

### Custom Gateway URL

For self-hosted or development environments:

```json
{
  "mcpServers": {
    "mcphub": {
      "command": "npx",
      "args": [
        "-y",
        "@mcphub/client",
        "--token",
        "YOUR_API_KEY",
        "--gateway-url",
        "https://your-custom-gateway.com/api/gateway"
      ]
    }
  }
}
```

## Features

- **Single Connection**: Connect once, access all your enabled integrations
- **Automatic Updates**: Always uses the latest client version via npx
- **Zero Configuration**: Works out of the box with your API key
- **Secure**: API key authentication with encrypted token storage on the server

## Available Integrations

Enable integrations in your MCP Hub dashboard:

- **GitHub** - Manage repositories, issues, and pull requests
- **Linear** - Create and manage Linear issues
- **Notion** - Search and manage Notion pages and databases
- **More coming soon!**

## How It Works

The MCP Hub client:

1. Connects to Claude Desktop using the MCP stdio protocol
2. Proxies MCP requests to the MCP Hub gateway
3. Authenticates using your API key
4. Routes requests to your enabled integrations
5. Returns results back to Claude

```
Claude Desktop
     ↓ (stdio)
@mcphub/client
     ↓ (HTTPS + API key)
MCP Hub Gateway
     ↓
Enabled Integrations
```

## Troubleshooting

### "Invalid API key" error

- Check that your API key starts with `mcp_sk_`
- Verify the key is active in your MCP Hub dashboard
- Make sure there are no extra spaces or quotes around the key

### "Gateway error" messages

- Check your internet connection
- Verify the gateway URL is correct
- Check MCP Hub status page for outages

### Claude Desktop doesn't see any tools

- Make sure you've enabled at least one integration in your dashboard
- Complete OAuth authentication for your integrations
- Restart Claude Desktop after changing the configuration

## Development

### Building from Source

```bash
git clone <repo-url>
cd packages/client
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Local Development

```bash
npm run dev  # Watch mode
```

Then update your Claude Desktop config to use the local build:

```json
{
  "mcpServers": {
    "mcphub": {
      "command": "node",
      "args": ["/path/to/packages/client/dist/index.js", "--token", "YOUR_API_KEY"]
    }
  }
}
```

## Support

- Documentation: [MCP Hub Docs](https://mcp-app-store.vercel.app/docs)
- Issues: [GitHub Issues](https://github.com/mcphub/mcphub/issues)
- Discord: [MCP Hub Community](https://discord.gg/mcphub)

## License

MIT
