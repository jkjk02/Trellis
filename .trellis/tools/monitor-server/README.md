# Trellis Channel Monitor Server

Real-time web monitoring for Trellis channels with Server-Sent Events (SSE).

## Features

- 🎭 Real-time event streaming via SSE
- 📊 Historical message retrieval
- 🌐 Beautiful web interface
- 🔄 Auto-reconnect on disconnect
- 💾 Multi-channel support

## Quick Start

### Installation

```bash
cd .trellis/tools/monitor-server
npm install
```

### Start Server

```bash
npm start
```

Server will start on `http://localhost:3737`

### Development Mode (with auto-reload)

```bash
npm run dev
```

## Usage

1. **Start the monitor server**:
   ```bash
   cd .trellis/tools/monitor-server
   npm start
   ```

2. **Open web interface**:
   - Navigate to `http://localhost:3737/`

3. **Enter channel name** (e.g., `test-tri-model`)

4. **Click "开始监控"** to start real-time monitoring

## API Endpoints

### GET /api/channel/:name/events
Server-Sent Events stream for real-time channel updates.

**Response**: text/event-stream
```
data: {"type":"message","data":{...}}
```

### GET /api/channel/:name/messages?limit=50
Get historical messages for a channel.

**Response**:
```json
{
  "channel": "test-tri-model",
  "messages": [
    {
      "type": "spawned",
      "details": "by=main worker=codex-backend ...",
      "timestamp": "07:42:15",
      "raw": "[spawned] by=main worker=codex-backend ..."
    }
  ]
}
```

### GET /api/channels
List all available channels.

**Response**:
```json
{
  "channels": ["test-tri-model", "my-feature"]
}
```

### GET /api/health
Server health check.

**Response**:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "connections": [
    { "channel": "test-tri-model", "clients": 2 }
  ]
}
```

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (SSE Client)   │
└────────┬────────┘
         │ SSE stream
         │
┌────────▼────────┐
│  Express Server │
│   (Port 3737)   │
└────────┬────────┘
         │ spawn
         │
┌────────▼────────┐
│ trellis channel │
│    messages     │
└─────────────────┘
```

## Configuration

**Environment Variables**:
- `PORT` — Server port (default: 3737)

## Technical Details

- **Polling Interval**: 2 seconds (configurable in `server.js`)
- **Message Format**: Parses `trellis channel messages` output
- **Connection Cleanup**: Automatic cleanup on client disconnect

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3737 (Windows)
netstat -ano | findstr :3737
taskkill /PID <pid> /F

# Or change port
PORT=3738 npm start
```

### SSE connection fails
- Check if `trellis` command is in PATH
- Verify channel name exists
- Check firewall/antivirus settings

### Messages not updating
- Verify channel has activity
- Check browser console for errors
- Restart server

## Development

**File Structure**:
```
monitor-server/
├── package.json        # Dependencies
├── server.js           # Express server + SSE
├── public/
│   └── index.html      # Web interface
└── README.md           # This file
```

**Adding Features**:
1. Edit `server.js` for backend changes
2. Edit `public/index.html` for UI changes
3. Restart server to apply changes

## License

MIT

## Author

幽浮喵 (ฅ'ω'ฅ)
