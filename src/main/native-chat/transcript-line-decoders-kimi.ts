// Kimi wire.jsonl line → NativeChatMessage decoder.
//
// Layout: <KIMI_CODE_HOME>/sessions/wd_<name>_<hash>/session_<uuid>/agents/<id>/wire.jsonl.
// Conversation content arrives via two record types:
// - context.append_message: user prompts (message.origin.kind === 'user'; other
//   origins — injection/system_trigger/skill_activation/background_task — are
//   synthetic and skipped, mirroring the AI-Vault Kimi parser).
// - context.append_loop_event: streamed assistant output. The persisted wire
//   stores one full content.part per step (not incremental chunks), so each
//   record maps to one message with no cross-line accumulation.

import type { NativeChatBlock, NativeChatMessage } from '../../shared/native-chat-types'
import {
  asRecord,
  extractString,
  parseJsonObject,
  timestampMs
} from '../ai-vault/session-scanner-values'
import { claudeContentBlocks, toolResultOutput } from './transcript-record-blocks'

export function decodeKimiTranscriptLine(
  line: string,
  fallbackId: string
): NativeChatMessage | null {
  const record = parseJsonObject(line)
  if (!record) {
    return null
  }
  const parsed = timestampMs(record.time)
  const timestamp = Number.isFinite(parsed) ? parsed : null

  if (record.type === 'context.append_message') {
    return decodeKimiContextMessage(record, fallbackId, timestamp)
  }
  if (record.type === 'context.append_loop_event') {
    return decodeKimiLoopEvent(record, fallbackId, timestamp)
  }
  return null
}

function decodeKimiContextMessage(
  record: Record<string, unknown>,
  fallbackId: string,
  timestamp: number | null
): NativeChatMessage | null {
  const message = asRecord(record.message)
  if (!message) {
    return null
  }
  if (message.role === 'user') {
    // Why: only real user turns belong in the conversation; Kimi injects
    // synthetic `role: "user"` messages (origin.kind !== 'user') for system
    // reminders like the auto-permission notice.
    if (asRecord(message.origin)?.kind !== 'user') {
      return null
    }
    const blocks = claudeContentBlocks(message.content)
    if (blocks.length === 0) {
      return null
    }
    return { id: fallbackId, role: 'user', blocks, timestamp, source: 'transcript' }
  }
  // Assistant context re-appends (e.g. after compaction) carry toolCalls; the
  // live turn's tool activity already streams via loop events, so only surface
  // these when the loop stream never saw them — dedup is the assembler's job.
  if (message.role === 'assistant') {
    const blocks = [
      ...claudeContentBlocks(message.content),
      ...kimiToolCallBlocks(message.toolCalls)
    ]
    if (blocks.length === 0) {
      return null
    }
    return { id: fallbackId, role: 'assistant', blocks, timestamp, source: 'transcript' }
  }
  return null
}

function decodeKimiLoopEvent(
  record: Record<string, unknown>,
  fallbackId: string,
  timestamp: number | null
): NativeChatMessage | null {
  const event = asRecord(record.event)
  if (!event) {
    return null
  }
  // Why: prefix the event uuid with the JSONL position so Native Chat preserves
  // transcript order even when uuids sort differently than the file.
  const uuid = extractString(event.uuid) ?? extractString(event.toolCallId)
  const id = uuid ? `${fallbackId}:${uuid}` : fallbackId

  if (event.type === 'content.part') {
    const part = asRecord(event.part)
    if (part?.type === 'text') {
      const text = extractString(part.text)
      return text
        ? {
            id,
            role: 'assistant',
            blocks: [{ type: 'text', text }],
            timestamp,
            source: 'transcript'
          }
        : null
    }
    if (part?.type === 'think') {
      const text = extractString(part.think) ?? extractString(part.text)
      return text
        ? {
            id,
            role: 'reasoning',
            blocks: [{ type: 'text', text }],
            timestamp,
            source: 'transcript'
          }
        : null
    }
    return null
  }

  if (event.type === 'tool.call') {
    const name = extractString(event.name) ?? 'tool'
    return {
      id,
      role: 'assistant',
      blocks: [{ type: 'tool-call', name, input: event.args }],
      timestamp,
      source: 'transcript'
    }
  }

  if (event.type === 'tool.result') {
    const result = asRecord(event.result)
    return {
      id,
      role: 'tool',
      blocks: [
        {
          type: 'tool-result',
          output: toolResultOutput(result?.output ?? event.result),
          ...(result?.isError === true ? { isError: true } : {})
        }
      ],
      timestamp,
      source: 'transcript'
    }
  }

  // step.begin / step.end carry no renderable content.
  return null
}

function kimiToolCallBlocks(value: unknown): NativeChatBlock[] {
  if (!Array.isArray(value)) {
    return []
  }
  const blocks: NativeChatBlock[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record) {
      continue
    }
    const fn = asRecord(record.function)
    const name = extractString(record.name) ?? extractString(fn?.name) ?? 'tool'
    let input: unknown = record.args ?? record.input ?? fn?.arguments
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input)
      } catch {
        // keep string
      }
    }
    blocks.push({ type: 'tool-call', name, input })
  }
  return blocks
}
