# Browser Automation Core - Command Reference

Simple, developer-friendly reference for all automation tools.

## 1. Direct CLI (Interactive)

The fastest way to test tools manually. Starts an interactive shell.

Usage:

```bash
npm run cli
```

Commands inside CLI:

```bash
> open https://google.com
> analyze                # Get accessibility tree analysis
> click uuid-123         # Click element by ID
> type uuid-456 hello    # Type text
> close                  # Close browser
```

## 2. HTTP Server (REST API)

Run the automation core as a service.

Start Server:

```bash
npm run start:http
```

API Endpoints:

### Agent Mode (Autonomous)

POST /api/run

```json
{
  "goal": "Go to google and search for weather",
  "options": { "headless": true }
}
```

### Direct Session (Step-by-Step)

1. Create Session
   POST /api/session

   ```json
   { "type": "direct" }
   ```

   Returns: `sessionId`

2. Execute Tool
   POST /api/session/:id/tool
   ```json
   {
     "tool": "analyze"
   }
   ```
   Supported Tools: `open`, `analyze`, `click`, `type`, `scroll`, `screenshot`

## 3. MCP Server (AI Agent Integration)

Connect to Claude Desktop, Cursor, or other MCP clients.

Start Server:

```bash
npm run start:mcp
```

### Protocol Details

- Transport: Stdio (Pipeline)
- Capabilities: Resources, Tools

### Available Tools

| Tool Name           | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `direct_analyze`    | **[NEW]** Get semantic page map (Accessibility Tree) |
| `direct_open`       | Open browser at URL                                  |
| `direct_click`      | Click element by UUID                                |
| `direct_type`       | Type text into input                                 |
| `direct_scroll`     | Scroll page up/down                                  |
| `direct_screenshot` | Capture screenshot                                   |

## 4. Standalone Scripts

Useful for specific, repeatable tasks.

### Workflows (.wky)

Execute and convert saved automation workflows.

```bash
# Run a specific workflow
npm run wky data/workflows/login.wky

# Convert Log (JSON) -> Workflow (WKY)
npm run wky:convert data/logs/session.json
```

### Hotel Extraction (Example)

Runs a dedicated script to extract hotel data from Google Maps.

```bash
node src/scripts/manual-hotel-extract.js
```

### HTML Utilities

Simplify HTML for LLM consumption.

```bash
# Simplify a file
npm run simplify data/html-pages/page.html

# Extract from URL
npm run extract https://example.com
```

## Configuration

Set these in your `.env` file.

```ini
# Browser Settings
CHROME_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
HEADLESS=true

# LLM Keys
OPENROUTER_API_KEY=sk-...
GEMINI_API_KEY=AIz...

# Server Ports
HTTP_PORT=3000
```
