/**
 * dsh-golden-ward · Customization golden guardian (host plugin, zero-dep)
 *
 * Keeps a "golden copy" of any frequently-overwritten file (default: the
 * dsh-market web client) and restores it whole-file when an upgrade clobbers
 * it. Exposes an HTTP API on the host web server:
 *
 *   GET/POST /goldenward/api?act=status  -> golden + target + marker report
 *   POST     /goldenward/api?act=init    -> capture current target as golden
 *   POST     /goldenward/api?act=restore -> copy golden over target (atomic tmp+mv)
 *
 * All paths come from config (see cordis.patch.yml); restore refuses to run
 * when either file is missing or golden lacks the marker string.
 */
export const name = 'golden-ward'
export const inject = ['webServer']

import { homedir } from 'node:os'
import { existsSync, readFileSync, copyFileSync, renameSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function apply(ctx) {
  const cfg = (ctx.config && ctx.config['golden-ward']) || {}
  const target = cfg.target || join(homedir(), '.dsh/profiles/web/node_modules/@dsh-market/plugin/lib/client.js')
  const goldenDir = cfg.goldenDir || join(homedir(), '.dsh/golden')
  const golden = join(goldenDir, 'client.golden.js')
  const marker = cfg.marker || 'golden-ward'
  const web = ctx['webServer']

  web.registerHttpHandler('/goldenward/api', async (req) => {
    const url = new URL(req.url, 'http://x')
    const act = url.searchParams.get('act') || 'status'
    try {
      if (act === 'status') {
        return {
          ok: true,
          target: { path: target, exists: existsSync(target), hasMarker: existsSync(target) && readFileSync(target, 'utf8').includes(marker) },
          golden: { path: golden, exists: existsSync(golden), size: existsSync(golden) ? readFileSync(golden).length : 0 },
          marker,
        }
      }
      if (act === 'init') {
        if (!existsSync(target)) throw new Error('target missing: ' + target)
        if (!readFileSync(target, 'utf8').includes(marker)) throw new Error('target lacks marker; capture refused')
        mkdirSync(goldenDir, { recursive: true })
        copyFileSync(target, golden)
        return { ok: true, captured: golden }
      }
      if (act === 'restore') {
        if (!existsSync(golden)) throw new Error('golden missing: ' + golden)
        if (!readFileSync(golden, 'utf8').includes(marker)) throw new Error('golden lacks marker; restore refused')
        mkdirSync(goldenDir, { recursive: true })
        const tmp = golden + '.tmp'
        copyFileSync(golden, tmp)
        renameSync(tmp, target)
        return { ok: true, restored: target }
      }
      throw new Error('unknown act: ' + act)
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) }
    }
  })
}
