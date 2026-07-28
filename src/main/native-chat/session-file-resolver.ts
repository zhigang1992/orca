import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'
import type { AgentType } from '../../shared/native-chat-types'
import { resolveNativeChatTranscriptAgent } from '../../shared/native-chat-agent-support'
import { walkSessionFiles } from '../ai-vault/session-scanner-discovery'
import {
  kimiPrimaryAgentWirePath,
  resolveKimiSessionsDir
} from '../ai-vault/session-scanner-kimi-paths'
import { asRecord } from '../ai-vault/session-scanner-values'
import { getOrcaManagedCodexHomePath } from '../codex/codex-home-paths'
import {
  findGrokChatHistoryBySessionId,
  resolveGrokSessionsDir
} from '../../shared/grok-session-paths'

// Why: these mirror the path constants in ai-vault/session-scanner.ts. Reads
// run in the main process against the runtime's own home directory; over SSH
// the remote main resolves its local home, so we never hardcode an absolute
// user path — homedir()/CODEX_HOME resolution stays runtime-relative and is
// computed per call (not at module load) so it tracks the live home.
function claudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects')
}

// Why: Orca launches Codex with ORCA_CODEX_HOME pointing at its own managed
// runtime home, so Orca-started Codex rollout files land under
// `<managed home>/sessions`, NOT `~/.codex/sessions`. Search the managed home
// first (that's where this main process's Codex sessions actually live), then
// fall back to CODEX_HOME/~/.codex so a non-Orca Codex transcript still resolves.
// Duplicates are filtered so a managed-home symlink to ~/.codex isn't scanned twice.
function codexSessionsDirs(): string[] {
  const candidates = [
    join(getOrcaManagedCodexHomePath(), 'sessions'),
    join(process.env.CODEX_HOME?.trim() || join(homedir(), '.codex'), 'sessions')
  ]
  return candidates.filter((dir, index) => candidates.indexOf(dir) === index)
}

function grokSessionsDir(): string {
  return resolveGrokSessionsDir(process.env, homedir())
}

export type ResolveSessionFileOptions = {
  /** Override the Claude projects root (used by tests / isolated scans). */
  claudeProjectsDir?: string
  /** Override the Codex sessions roots, searched in order (tests / isolated
   *  scans). Defaults to the orca-managed home then CODEX_HOME/~/.codex. */
  codexSessionsDirs?: string[]
  /** Override the Grok sessions root (`~/.grok/sessions`). */
  grokSessionsDir?: string
  /** Override the Kimi sessions root (`<KIMI_CODE_HOME>/sessions`). */
  kimiSessionsDir?: string
  /** Authoritative transcript path reported by the agent hook
   *  (`providerSession.transcriptPath`). When set and the file exists, it is used
   *  directly — recent Claude Code names the transcript with a UUID that differs
   *  from the hook session_id, so the id-based glob below would miss it. */
  transcriptPath?: string
}

/**
 * Resolve the on-disk JSONL transcript path for a given agent + session id.
 *
 * Prefers the hook-reported `transcriptPath` when it exists on disk (authoritative).
 * Otherwise: Claude nests transcripts by project slug
 * (`~/.claude/projects/<slug>/<id>.jsonl`), so we glob the projects subdirs for
 * `<id>.jsonl`. Codex stores rollout files under date-nested dirs whose file name
 * embeds the session id, so we match by the session id appearing in the file name.
 * Returns null when no matching transcript exists.
 */
export async function resolveSessionFilePath(
  agent: AgentType,
  sessionId: string,
  options: ResolveSessionFileOptions = {}
): Promise<string | null> {
  const transcriptAgent = resolveNativeChatTranscriptAgent(agent)
  if (!transcriptAgent) {
    return null
  }
  // Why: the hook's transcript_path is the exact file the agent is writing, so it
  // beats reconstructing a path from the session id. Guard with existsSync so a
  // stale/remote path falls through to the id-based search rather than returning
  // a non-existent file.
  const hookPath = options.transcriptPath?.trim()
  if (hookPath && extname(hookPath) === '.jsonl' && existsSync(hookPath)) {
    return hookPath
  }

  const trimmedId = sessionId.trim()
  if (!trimmedId) {
    return null
  }

  if (transcriptAgent === 'claude') {
    return resolveClaudeSessionFile(trimmedId, options.claudeProjectsDir ?? claudeProjectsDir())
  }
  if (transcriptAgent === 'codex') {
    return resolveCodexSessionFile(trimmedId, options.codexSessionsDirs ?? codexSessionsDirs())
  }
  if (transcriptAgent === 'grok') {
    return resolveGrokSessionFile(trimmedId, options.grokSessionsDir ?? grokSessionsDir())
  }
  if (transcriptAgent === 'kimi') {
    return resolveKimiSessionFile(trimmedId, options.kimiSessionsDir ?? resolveKimiSessionsDir())
  }
  return null
}

async function resolveClaudeSessionFile(
  sessionId: string,
  projectsDir: string
): Promise<string | null> {
  const targetName = `${sessionId}.jsonl`
  const files = await walkSessionFiles(projectsDir, 'claude', [], {
    extensions: new Set(['.jsonl']),
    filePredicate: (path) => basename(path) === targetName
  })
  return files[0] ?? null
}

async function resolveCodexSessionFile(
  sessionId: string,
  sessionsDirs: string[]
): Promise<string | null> {
  // Codex rollout file names embed the session id (rollout-<ts>-<id>.jsonl), so
  // match the id as a suffix of the file's base name rather than an exact name.
  // Search each candidate root (managed home first) and stop at the first match.
  for (const sessionsDir of sessionsDirs) {
    if (!existsSync(sessionsDir)) {
      continue
    }
    const files = await walkSessionFiles(sessionsDir, 'codex', [], {
      extensions: new Set(['.jsonl']),
      filePredicate: (path) => {
        const name = basename(path, extname(path))
        return name === sessionId || name.endsWith(`-${sessionId}`)
      }
    })
    if (files[0]) {
      return files[0]
    }
  }
  return null
}

async function resolveGrokSessionFile(
  sessionId: string,
  sessionsDir: string
): Promise<string | null> {
  // Why: Native Chat runs on the main thread; use the bounded async direct-layout
  // lookup instead of blocking, then repeating, a recursive full-tree scan.
  const history = await findGrokChatHistoryBySessionId(sessionsDir, sessionId)
  return history
}

// Kimi session dirs are named `session_<uuid>` and the id keeps that prefix
// (it's what `kimi --session <id>` expects); tolerate a bare uuid too.
const KIMI_SESSION_ID_PATTERN = /^(session_)?[a-z0-9-]+$/i

async function resolveKimiSessionFile(
  sessionId: string,
  sessionsDir: string
): Promise<string | null> {
  if (!KIMI_SESSION_ID_PATTERN.test(sessionId)) {
    return null
  }
  const dirName = sessionId.startsWith('session_') ? sessionId : `session_${sessionId}`
  // Layout: <sessionsDir>/wd_<name>_<hash>/session_<uuid>/state.json — prune the
  // walk to that exact shape so agents/<id>/ and logs/ subtrees are never read.
  const stateFiles = await walkSessionFiles(sessionsDir, 'kimi', [], {
    extensions: new Set(['.json']),
    filePredicate: (path) => basename(path) === 'state.json',
    directoryPredicate: (name, depth) =>
      depth === 0 ? name.startsWith('wd_') : depth === 1 ? name === dirName : false
  })
  const statePath = stateFiles[0]
  if (!statePath) {
    return null
  }
  let stateRecord: Record<string, unknown> | null = null
  try {
    stateRecord = asRecord(JSON.parse(await readFile(statePath, 'utf-8')) as unknown)
  } catch {
    // A malformed state.json still resolves a plausible path (defaults to agents/main).
  }
  const wirePath = kimiPrimaryAgentWirePath(statePath, stateRecord)
  return existsSync(wirePath) ? wirePath : null
}
