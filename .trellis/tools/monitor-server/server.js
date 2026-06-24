#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3737;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files (HTML monitor) from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active SSE connections
const sseConnections = new Map(); // channelName -> Set<response>

/**
 * SSE endpoint: /api/channel/:name/events
 * Real-time event stream for a specific channel
 */
app.get('/api/channel/:name/events', (req, res) => {
  const channelName = req.params.name;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register this connection
  if (!sseConnections.has(channelName)) {
    sseConnections.set(channelName, new Set());
  }
  sseConnections.get(channelName).add(res);

  console.log(`[SSE] Client connected to channel: ${channelName}`);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', channel: channelName })}\n\n`);

  // Start monitoring this channel
  startChannelMonitor(channelName);

  // Clean up on disconnect
  req.on('close', () => {
    const connections = sseConnections.get(channelName);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(channelName);
        console.log(`[SSE] No more clients for channel: ${channelName}`);
      }
    }
    console.log(`[SSE] Client disconnected from channel: ${channelName}`);
  });
});

/**
 * API endpoint: GET /api/channel/:name/messages
 * Get historical messages for a channel
 */
app.get('/api/channel/:name/messages', (req, res) => {
  const channelName = req.params.name;
  const limit = parseInt(req.query.limit) || 50;

  // Execute: trellis channel messages <name> --last <limit>
  const child = spawn('trellis', ['channel', 'messages', channelName, '--last', limit.toString()], {
    cwd: process.cwd(),
    shell: true,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  child.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: 'Failed to get channel messages',
        stderr: stderr.trim(),
      });
    }

    // Parse messages (format: [type] by=X ... timestamp)
    const messages = parseChannelMessages(stdout);
    res.json({ channel: channelName, messages });
  });
});

/**
 * API endpoint: GET /api/channels
 * List all available channels
 */
app.get('/api/channels', (req, res) => {
  const channelsDir = getChannelsDirectory();

  if (!fs.existsSync(channelsDir)) {
    return res.json({ channels: [] });
  }

  const channels = fs.readdirSync(channelsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  res.json({ channels });
});

/**
 * Start monitoring a channel and push events via SSE
 */
function startChannelMonitor(channelName) {
  const connections = sseConnections.get(channelName);
  if (!connections || connections.size === 0) return;

  // Poll channel messages every 2 seconds
  const intervalId = setInterval(() => {
    const connections = sseConnections.get(channelName);
    if (!connections || connections.size === 0) {
      clearInterval(intervalId);
      return;
    }

    // Execute: trellis channel messages <name> --last 1
    const child = spawn('trellis', ['channel', 'messages', channelName, '--last', '1'], {
      cwd: process.cwd(),
      shell: true,
    });

    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) return;

      const messages = parseChannelMessages(stdout);
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];

        // Broadcast to all connected clients
        connections.forEach((res) => {
          try {
            res.write(`data: ${JSON.stringify({ type: 'message', data: latestMessage })}\n\n`);
          } catch (err) {
            console.error('[SSE] Failed to send message:', err.message);
          }
        });
      }
    });
  }, 2000); // Poll every 2 seconds
}

/**
 * Parse channel messages output
 * Format: [type]   by=X  details  timestamp
 */
function parseChannelMessages(output) {
  const lines = output.trim().split('\n').filter(line => line.trim());
  const messages = [];

  for (const line of lines) {
    const match = line.match(/^\[(\w+)\]\s+(.+?)\s+(\d{2}:\d{2}:\d{2})$/);
    if (match) {
      const [, type, details, timestamp] = match;
      messages.push({
        type,
        details: details.trim(),
        timestamp,
        raw: line,
      });
    }
  }

  return messages;
}

/**
 * Get channels directory path
 */
function getChannelsDirectory() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const projectBucket = path.basename(process.cwd()).replace(/[^a-zA-Z0-9-]/g, '-');
  return path.join(home, '.trellis', 'channels', projectBucket);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connections: Array.from(sseConnections.keys()).map(channel => ({
      channel,
      clients: sseConnections.get(channel).size,
    })),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎭 Trellis Channel Monitor Server`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}/ to view the monitor`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log('');
  console.log('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');

  // Close all SSE connections
  sseConnections.forEach((connections, channel) => {
    connections.forEach((res) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'server-shutdown' })}\n\n`);
        res.end();
      } catch (err) {
        // Ignore errors on close
      }
    });
  });

  process.exit(0);
});
