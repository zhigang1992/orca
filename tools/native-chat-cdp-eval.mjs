// Evaluate a JS expression in the dev Orca renderer over CDP (Chromium remote
// debugging). Usage: node tools/native-chat-cdp-eval.mjs "<expr>" [port]
// The dev runner prints its picked port as "[orca-dev] Remote debugging on
// http://127.0.0.1:<port>" (default seed range 9333..9532).
import { createRequire } from 'node:module'
import http from 'node:http'

const require = createRequire(import.meta.url)
const WebSocket = require('ws')

const expr = process.argv[2]
const port = process.argv[3] ?? '9459'
if (!expr) {
  console.error('usage: node tools/native-chat-cdp-eval.mjs "<expr>" [port]')
  process.exit(2)
}
const targets = await new Promise((resolve, reject) => {
  http
    .get(`http://127.0.0.1:${port}/json`, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(JSON.parse(data)))
    })
    .on('error', reject)
})
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl, {
  perMessageDeflate: false,
  maxPayload: 64 * 1024 * 1024
})
let id = 0
const pending = new Map()
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg)
    pending.delete(msg.id)
  }
})
ws.on('open', async () => {
  const result = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  })
  console.log(
    JSON.stringify(result.result?.result?.value ?? result.result, null, 2)?.slice(0, 8000)
  )
  ws.close()
  process.exit(0)
})
setTimeout(() => {
  console.error('timeout')
  process.exit(1)
}, 15000)
