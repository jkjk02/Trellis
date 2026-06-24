import type { AdapterEvent, ParseResult } from "./types.js";

/**
 * Gemini CLI adapter (stream-json over stdio).
 *
 * Wire shape (from probe):
 *
 *   Inbound (stdout) JSON events:
 *     {"type":"init","timestamp":"...","session_id":"...","model":"..."}
 *     {"type":"message","timestamp":"...","role":"user|assistant","content":"..."}
 *     {"type":"done","timestamp":"..."}
 *     {"type":"error","timestamp":"...","message":"..."}
 *
 *   Outbound (stdin): plain text messages (similar to Claude)
 *
 *   Protocol: simpler than Codex (no JSON-RPC), similar to Claude (stream-json)
 *   No handshake required — worker is ready immediately after spawn.
 *
 * This module exposes:
 *   - parseGeminiLine(line, ctx) — event parser
 *   - encodeGeminiUserMessage    — stdin framing
 *   - buildGeminiArgs             — CLI args
 *   - createGeminiCtx             — per-worker state
 */

export interface GeminiCtx {
  sessionId?: string;
  finalMessageSeen: boolean;
}

export function createGeminiCtx(): GeminiCtx {
  return { finalMessageSeen: false };
}

/**
 * Parse one line of Gemini CLI stream-json output into channel events.
 */
export function parseGeminiLine(line: string, ctx: GeminiCtx): ParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(line);
  } catch {
    // Ignore non-JSON lines (warnings, debug output)
    return { events: [] };
  }

  switch (parsed.type) {
    case "init":
      // Worker initialized, capture session ID
      if (parsed.session_id) {
        return {
          events: [],
          side: {
            persistSessionId: parsed.session_id,
          },
        };
      }
      return { events: [] };

    case "message":
      // Assistant message
      if (parsed.role === "assistant" && parsed.content) {
        return {
          events: [
            {
              kind: "message",
              payload: {
                text: parsed.content,
                role: "assistant",
              },
            },
          ],
        };
      }
      // User messages echoed back — skip
      return { events: [] };

    case "tool_call":
      // Tool execution started
      return {
        events: [
          {
            kind: "progress",
            payload: {
              status: "inProgress",
              tool: parsed.tool_name || "unknown",
              args: parsed.args || {},
            },
          },
        ],
      };

    case "tool_result":
      // Tool execution completed
      return {
        events: [
          {
            kind: "progress",
            payload: {
              status: "completed",
              tool: parsed.tool_name || "unknown",
              result: parsed.result,
            },
          },
        ],
      };

    case "done":
      // Turn completed
      ctx.finalMessageSeen = true;
      return {
        events: [{ kind: "done" }],
      };

    case "error":
      // Worker error
      return {
        events: [
          {
            kind: "error",
            payload: {
              message: parsed.message || parsed.error || "Unknown Gemini error",
            },
          },
        ],
      };

    case "progress":
      // Progress notification (e.g., thinking, typing)
      return {
        events: [
          {
            kind: "progress",
            payload: {
              status: parsed.status || "inProgress",
              message: parsed.message,
            },
          },
        ],
      };

    default:
      // Unknown event type — skip silently
      return { events: [] };
  }
}

/**
 * Build CLI args for spawning Gemini worker.
 */
export function buildGeminiArgs(opts: {
  model?: string;
  systemPrompt?: string;
  resume?: string;
}): string[] {
  const args = [
    "--output-format",
    "stream-json",
    "--yolo", // Auto-approve tools (Channel controls approval)
  ];

  if (opts.model) {
    args.push("-m", opts.model);
  }

  if (opts.resume) {
    args.push("--resume", opts.resume);
  }

  // Note: Gemini CLI may not support --system-prompt flag
  // If unsupported, systemPrompt will be prepended as first message
  // (handled in supervisor or encodeUserMessage with ctx.firstMessage flag)

  return args;
}

/**
 * Encode a channel user message for Gemini worker stdin.
 *
 * Gemini accepts plain text via stdin (appended to current turn).
 * For first message, prepend system prompt if needed.
 */
export function encodeGeminiUserMessage(text: string, ctx: GeminiCtx): string {
  // Gemini stdin: plain text + newline (similar to Claude -p mode)
  return text + "\n";
}

/**
 * Encode an interrupt message for Gemini worker.
 *
 * Gemini may not have native interrupt protocol.
 * Prefix with [INTERRUPT] marker to signal priority shift.
 */
export function encodeGeminiInterruptMessage(
  text: string,
  ctx: GeminiCtx,
): string {
  return "[INTERRUPT - drop current work and follow this instruction]\n" + text + "\n";
}
