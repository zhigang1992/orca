import { describe, expect, it } from 'vitest'
import { decodeKimiTranscriptLine } from './transcript-line-decoders'

const TIME = 1785223996579

describe('decodeKimiTranscriptLine', () => {
  it('decodes a real-origin user prompt', () => {
    const line = JSON.stringify({
      type: 'context.append_message',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Fix the bug' }],
        toolCalls: [],
        origin: { kind: 'user' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-1')).toEqual({
      id: 'fb-1',
      role: 'user',
      blocks: [{ type: 'text', text: 'Fix the bug' }],
      timestamp: TIME,
      source: 'transcript'
    })
  })

  it.each(['injection', 'system_trigger', 'skill_activation', 'background_task'])(
    'skips synthetic user messages with origin kind %s',
    (kind) => {
      const line = JSON.stringify({
        type: 'context.append_message',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Auto permission mode is active.' }],
          toolCalls: [],
          origin: { kind }
        },
        time: TIME
      })
      expect(decodeKimiTranscriptLine(line, `fb-${kind}`)).toBeNull()
    }
  )

  it('decodes streamed assistant text from content.part', () => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: {
        type: 'content.part',
        uuid: 'part-1',
        turnId: '0',
        step: 1,
        stepUuid: 'step-1',
        part: { type: 'text', text: 'Here is the fix.' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-2')).toEqual({
      id: 'fb-2:part-1',
      role: 'assistant',
      blocks: [{ type: 'text', text: 'Here is the fix.' }],
      timestamp: TIME,
      source: 'transcript'
    })
  })

  it('decodes think parts as reasoning', () => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: {
        type: 'content.part',
        uuid: 'part-think',
        turnId: '0',
        step: 1,
        stepUuid: 'step-1',
        part: { type: 'think', think: 'Planning the change' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-3')).toMatchObject({
      id: 'fb-3:part-think',
      role: 'reasoning',
      blocks: [{ type: 'text', text: 'Planning the change' }],
      source: 'transcript'
    })
  })

  it('decodes a tool.call loop event into a tool-call block', () => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: {
        type: 'tool.call',
        uuid: 'tool_abc123',
        turnId: '0',
        step: 2,
        stepUuid: 'step-2',
        toolCallId: 'tool_abc123',
        name: 'Read',
        args: { path: 'src/shared/native-chat-agent-support.ts' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-4')).toEqual({
      id: 'fb-4:tool_abc123',
      role: 'assistant',
      blocks: [
        {
          type: 'tool-call',
          name: 'Read',
          input: { path: 'src/shared/native-chat-agent-support.ts' }
        }
      ],
      timestamp: TIME,
      source: 'transcript'
    })
  })

  it('decodes a tool.result loop event into a tool-result block', () => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: {
        type: 'tool.result',
        parentUuid: 'tool_abc123',
        toolCallId: 'tool_abc123',
        result: { output: 'file contents here' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-5')).toEqual({
      id: 'fb-5:tool_abc123',
      role: 'tool',
      blocks: [{ type: 'tool-result', output: 'file contents here' }],
      timestamp: TIME,
      source: 'transcript'
    })
  })

  it('marks errored tool results', () => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: {
        type: 'tool.result',
        parentUuid: 'tool_err',
        toolCallId: 'tool_err',
        result: { output: 'rg: No such file or directory (os error 2)', isError: true }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-6')).toMatchObject({
      role: 'tool',
      blocks: [
        { type: 'tool-result', output: 'rg: No such file or directory (os error 2)', isError: true }
      ]
    })
  })

  it('decodes toolCalls on a re-appended assistant context message', () => {
    const line = JSON.stringify({
      type: 'context.append_message',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Let me read that file.' }],
        toolCalls: [{ id: 'c1', name: 'Read', args: { path: 'a.ts' } }],
        origin: { kind: 'assistant' }
      },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, 'fb-7')).toEqual({
      id: 'fb-7',
      role: 'assistant',
      blocks: [
        { type: 'text', text: 'Let me read that file.' },
        { type: 'tool-call', name: 'Read', input: { path: 'a.ts' } }
      ],
      timestamp: TIME,
      source: 'transcript'
    })
  })

  it.each(['metadata', 'config.update', 'turn.prompt', 'usage.record', 'tools.set_active_tools'])(
    'skips non-conversation record type %s',
    (type) => {
      expect(
        decodeKimiTranscriptLine(JSON.stringify({ type, time: TIME }), `fb-${type}`)
      ).toBeNull()
    }
  )

  it.each(['step.begin', 'step.end'])('skips loop event %s', (eventType) => {
    const line = JSON.stringify({
      type: 'context.append_loop_event',
      event: { type: eventType, uuid: 'step-1', turnId: '0', step: 1 },
      time: TIME
    })
    expect(decodeKimiTranscriptLine(line, `fb-${eventType}`)).toBeNull()
  })

  it('returns null for malformed lines', () => {
    expect(decodeKimiTranscriptLine('not json', 'fb-bad')).toBeNull()
    expect(decodeKimiTranscriptLine('', 'fb-empty')).toBeNull()
  })

  it('decodes a real-schema transcript prefix into a conversation', () => {
    const rows = [
      { type: 'metadata', protocol_version: '1.4', created_at: TIME },
      { type: 'config.update', modelAlias: 'kimi-for-coding', time: TIME },
      {
        type: 'context.append_message',
        message: {
          role: 'user',
          content: [
            { type: 'text', text: '<system-reminder>Auto permission mode</system-reminder>' }
          ],
          toolCalls: [],
          origin: { kind: 'injection', variant: 'permission_mode' }
        },
        time: TIME
      },
      {
        type: 'context.append_message',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Visible prompt' }],
          toolCalls: [],
          origin: { kind: 'user' }
        },
        time: TIME
      },
      {
        type: 'context.append_loop_event',
        event: { type: 'step.begin', uuid: 's1', turnId: '0', step: 1 },
        time: TIME
      },
      {
        type: 'context.append_loop_event',
        event: {
          type: 'content.part',
          uuid: 'p1',
          turnId: '0',
          step: 1,
          stepUuid: 's1',
          part: { type: 'text', text: 'Visible answer' }
        },
        time: TIME
      },
      {
        type: 'context.append_loop_event',
        event: {
          type: 'tool.call',
          uuid: 'tool_x',
          turnId: '0',
          step: 1,
          stepUuid: 's1',
          toolCallId: 'tool_x',
          name: 'Bash',
          args: { command: 'ls' }
        },
        time: TIME
      },
      {
        type: 'context.append_loop_event',
        event: {
          type: 'tool.result',
          parentUuid: 'tool_x',
          toolCallId: 'tool_x',
          result: { output: 'a.txt' }
        },
        time: TIME
      },
      {
        type: 'context.append_loop_event',
        event: { type: 'step.end', uuid: 's1', turnId: '0', step: 1, finishReason: 'tool_use' },
        time: TIME
      },
      {
        type: 'usage.record',
        model: 'kimi-for-coding',
        usage: { inputOther: 1, output: 2, inputCacheRead: 3, inputCacheCreation: 4 },
        time: TIME
      }
    ]

    const messages = rows
      .map((row, index) => decodeKimiTranscriptLine(JSON.stringify(row), `fb-real-${index}`))
      .filter((message) => message !== null)

    expect(messages).toMatchObject([
      { role: 'user', blocks: [{ type: 'text', text: 'Visible prompt' }] },
      { role: 'assistant', blocks: [{ type: 'text', text: 'Visible answer' }] },
      {
        role: 'assistant',
        blocks: [{ type: 'tool-call', name: 'Bash', input: { command: 'ls' } }]
      },
      { role: 'tool', blocks: [{ type: 'tool-result', output: 'a.txt' }] }
    ])
  })
})
