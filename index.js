/**
 * Host half of the wallpaper bundle.
 *
 * The persisted preference row is this entry's own Config: every field is
 * declared `volatile`, so the Host settings service projects it into the form
 * the browser edits through `ctx.configForms.get('dsh-wallpaper')`.
 *
 * The Host also serves the wallpaper bytes on the Web origin, because the page
 * must not depend on the desktop app's sandboxed `file://` access:
 * - `/dsh-wallpaper/media/picture`      the picture picked in the browser;
 * - `/dsh-wallpaper/media/desktop`      the bytes of the current desktop wallpaper;
 * - `/dsh-wallpaper/media/desktop-info` the identity of the current desktop wallpaper.
 *
 * The Windows desktop wallpaper is read where Windows keeps it: the path in
 * `HKCU\Control Panel\Desktop` plus the file's size and modification time, so
 * replacing the file under the same name also counts as a change. Windows
 * transcoders report the live image through `TranscodedImageCache` or through a
 * `TranscodedWallpaper` file; those are tried in turn when the path is unset.
 *
 * @module @local/dsh-wallpaper
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { extname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'

/** Route prefix served on the Web origin. */
const MEDIA_PREFIX = '/dsh-wallpaper/media'

/** Largest picture this plugin serves, in bytes. */
const MAX_PICTURE_BYTES = 64 * 1024 * 1024

/** Picture extensions mapped to the media type the browser receives. */
const PICTURE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Preference row: every field is user-editable from the Settings panel. */
export const Config = z.object({
  /** `none` hides the background; `picture` uses the picked picture; `desktop` follows the desktop wallpaper. */
  mode: z.union([z.const('none'), z.const('picture'), z.const('desktop')]).default('none').volatile(),
  /** 0 hides the picture, 100 draws it undimmed. */
  opacity: z.natural().min(0).max(100).default(35).volatile(),
  /** `cover` fills the window; `contain` shows the whole picture. */
  fit: z.union([z.const('cover'), z.const('contain')]).default('cover').volatile(),
  /** `none` is the picture as picked; `dark` and `light` dim it toward the interface. */
  veil: z.union([z.const('none'), z.const('dark'), z.const('light')]).default('none').volatile(),
  /** The picked picture as base64 bytes; the browser encodes it, the Host decodes and serves it. */
  pictureData: z.string().default('').volatile(),
  /** File name of the picked picture, shown in the settings page. */
  pictureFileName: z.string().default('').volatile(),
  /** Cache-busting token rewritten whenever a new picture is picked. */
  pictureVersion: z.string().default('').volatile(),
  /** Seconds between desktop wallpaper checks; 0 stops checking. */
  pollSeconds: z.natural().min(0).max(3600).default(300).volatile(),
})

/** Send one JSON payload. */
function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

/** Send picture bytes with an ETag so an unchanged picture stays cached. */
function sendBytes(request, response, bytes, mediaType, etag) {
  const tag = `"${etag}"`
  const headers = {
    'content-type': mediaType,
    'content-length': String(bytes.byteLength),
    etag: tag,
    'cache-control': 'private, max-age=600',
    'x-content-type-options': 'nosniff',
  }
  if (request.headers['if-none-match'] === tag) {
    response.writeHead(304, headers)
    response.end()
    return
  }
  response.writeHead(200, headers)
  response.end(bytes)
}

/** Media type of one picture path, or undefined when the Host will not serve it. */
function mediaTypeOf(path) {
  return PICTURE_TYPES[extname(path).toLowerCase()]
}

/** Read one picture file and describe its bytes, or report why it cannot be served. */
async function loadPicture(path) {
  if (typeof path !== 'string' || path.trim() === '') return { status: 'error', reason: 'empty-path' }
  const mediaType = mediaTypeOf(path)
  if (mediaType === undefined) return { status: 'error', reason: 'unsupported-type' }
  let info
  try {
    info = await stat(path)
  } catch {
    return { status: 'error', reason: 'missing' }
  }
  if (!info.isFile()) return { status: 'error', reason: 'not-a-file' }
  if (info.size > MAX_PICTURE_BYTES) return { status: 'error', reason: 'too-large' }
  let bytes
  try {
    bytes = await readFile(path)
  } catch {
    return { status: 'error', reason: 'unreadable' }
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  return {
    status: 'ok',
    bytes,
    mediaType,
    sha256,
    path,
    name: path.split(/[\\/]/u).pop() ?? path,
    size: info.size,
  }
}

/** Decode the picked picture's base64 payload into bytes, or undefined when there is none. */
function pictureBytesOf(value) {
  if (typeof value !== 'string' || value === '') return undefined
  try {
    const bytes = Buffer.from(value, 'base64')
    return bytes.byteLength === 0 ? undefined : bytes
  } catch {
    return undefined
  }
}

/** Read one value from `HKCU\Control Panel\Desktop` through PowerShell. */
function readDesktopValue(name) {
  const script = [
    "$key = 'HKCU:\\Control Panel\\Desktop'",
    `$value = (Get-ItemProperty -LiteralPath $key -Name '${name}' -ErrorAction SilentlyContinue).${name}`,
    'if ($null -ne $value) { [Console]::Out.Write([string]$value) }',
  ].join('\n')
  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-EncodedCommand',
    Buffer.from(script, 'utf16le').toString('base64'),
  ]
  return new Promise((resolve) => {
    execFile('powershell.exe', args, { timeout: 8000, windowsHide: true, maxBuffer: 64 * 1024 }, (error, stdout) => {
      if (error) {
        resolve({ status: 'error', value: '' })
        return
      }
      resolve({ status: 'ok', value: String(stdout).trim() })
    })
  })
}

/** Read `TranscodedImageCache` and return the wallpaper path it carries. */
function readTranscodedCache() {
  const script = [
    "$key = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Wallpapers'",
    "$value = (Get-ItemProperty -LiteralPath $key -Name 'TranscodedImageCache' -ErrorAction SilentlyContinue).TranscodedImageCache",
    'if ($null -eq $value -or $value.Length -le 24) { exit 0 }',
    '$text = [System.Text.Encoding]::Unicode.GetString($value, 24, $value.Length - 24)',
    '$end = $text.IndexOf([char]0)',
    'if ($end -ge 0) { $text = $text.Substring(0, $end) }',
    '[Console]::Out.Write($text)',
  ].join('\n')
  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-EncodedCommand',
    Buffer.from(script, 'utf16le').toString('base64'),
  ]
  return new Promise((resolve) => {
    execFile('powershell.exe', args, { timeout: 8000, windowsHide: true, maxBuffer: 128 * 1024 }, (error, stdout) => {
      if (error) {
        resolve('')
        return
      }
      resolve(String(stdout).trim())
    })
  })
}

/**
 * Candidate sources, in priority order, for the desktop wallpaper Windows shows
 * for this user. The first one that exists wins.
 */
async function desktopCandidates() {
  const [wallpaper, style, tile] = await Promise.all([
    readDesktopValue('Wallpaper'),
    readDesktopValue('WallpaperStyle'),
    readDesktopValue('TileWallpaper'),
  ])
  const candidates = []
  if (wallpaper.status === 'ok' && wallpaper.value !== '') candidates.push(wallpaper.value)
  const cachePath = await readTranscodedCache()
  if (cachePath !== '') candidates.push(cachePath)
  candidates.push(join(homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper'))
  return {
    candidates,
    style: style.status === 'ok' ? style.value : '',
    tile: tile.status === 'ok' ? tile.value : '',
  }
}

/**
 * Describe the desktop wallpaper currently shown, with the URL that serves it.
 * The digest combines which candidate matched, its size, and its modification
 * time, so any wallpaper change yields a new digest.
 */
async function loadDesktopWallpaper() {
  if (process.platform !== 'win32') return { status: 'error', reason: 'unsupported-platform' }
  const { candidates, style, tile } = await desktopCandidates()
  for (const candidate of candidates) {
    // The transcoder caches a stale image, and an unsupported container cannot be served.
    if (mediaTypeOf(candidate) === undefined) continue
    let info
    try {
      info = await stat(candidate)
    } catch {
      continue
    }
    if (!info.isFile() || info.size === 0 || info.size > MAX_PICTURE_BYTES) continue
    const digest = createHash('sha256')
      .update(`${candidate}|${info.size}|${String(info.mtimeMs)}|${style}|${tile}`)
      .digest('hex')
    return {
      status: 'ok',
      path: candidate,
      name: candidate.split(/[\\/]/u).pop() ?? candidate,
      size: info.size,
      modifiedAt: Math.round(info.mtimeMs),
      digest,
      style,
      tile,
      url: `${MEDIA_PREFIX}/desktop?d=${digest}`,
    }
  }
  return { status: 'error', reason: 'no-wallpaper' }
}

/**
 * Register the media routes next to the Web GUI.
 * @param ctx - Host plugin context.
 * @param config - this entry's live preference row.
 */
export function apply(ctx, config) {
  ctx.inject(['webServer'], (child) => {
    child.effect(
      () => child.webServer.register({
        path: `${MEDIA_PREFIX}/picture`,
        handler: async (request, response) => {
          const bytes = pictureBytesOf(config?.pictureData)
          if (bytes === undefined) {
            sendJson(response, 404, { error: 'no-picture' })
            return
          }
          const version = typeof config?.pictureVersion === 'string' ? config.pictureVersion : ''
          sendBytes(request, response, bytes, 'image/png', `${hashOf(bytes)}-${version}`)
        },
      }),
      'dsh-wallpaper: picture bytes',
    )

    child.effect(
      () => child.webServer.register({
        path: `${MEDIA_PREFIX}/desktop-info`,
        handler: async (_request, response) => {
          const wallpaper = await loadDesktopWallpaper()
          sendJson(response, 200, wallpaper.status === 'ok'
            ? wallpaper
            : { status: wallpaper.status, reason: wallpaper.reason, platform: process.platform })
        },
      }),
      'dsh-wallpaper: desktop wallpaper identity',
    )

    child.effect(
      () => child.webServer.register({
        path: `${MEDIA_PREFIX}/desktop`,
        handler: async (request, response) => {
          const wallpaper = await loadDesktopWallpaper()
          if (wallpaper.status !== 'ok') {
            sendJson(response, 404, { error: wallpaper.reason })
            return
          }
          const picture = await loadPicture(wallpaper.path)
          if (picture.status !== 'ok') {
            sendJson(response, 404, { error: picture.reason, path: wallpaper.path })
            return
          }
          sendBytes(request, response, picture.bytes, picture.mediaType, wallpaper.digest)
        },
      }),
      'dsh-wallpaper: desktop wallpaper bytes',
    )
  })
}

/** Stable digest of one byte buffer. */
function hashOf(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}
