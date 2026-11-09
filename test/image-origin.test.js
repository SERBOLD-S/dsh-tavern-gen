import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/dsh-tavern-gen'

async function createPlugin(t, { config = {}, getOrigin } = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'dsh-tavern-gen-origin-'))
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const root = path.join(temporary, 'plugins', 'dsh-tavern-gen')
  await mkdir(root, { recursive: true })
  await cp(path.join(ROOT, 'lib'), path.join(root, 'lib'), { recursive: true })
  // Exercise the real tool and routes without submitting a paid image request.
  await writeFile(path.join(root, 'lib', 'image-providers.js'), `
    export const IMAGE_PROVIDERS = [{ id: 'openai', label: 'Test' }]
    export async function testImageChannel() { return { ok: true } }
    export async function generateImage() {
      return { mediaType: 'image/png', bytes: Buffer.from('test image') }
    }
  `)
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(path.join(root, 'config.json'), JSON.stringify({
    imageBackend: 'openai',
    activeImageChannel: 'test',
    imageChannels: [{ id: 'test', name: 'Test', provider: 'openai', apiKey: 'test-only' }],
    ...config,
  }))
  await writeFile(path.join(root, 'definitions.json'), JSON.stringify({ version: 1, characters: [] }))
  await writeFile(path.join(root, 'worldbook.json'), JSON.stringify({ version: 3, buckets: [] }))

  const routes = new Map()
  let resolveTool
  const ready = new Promise(resolve => { resolveTool = resolve })
  const webServer = {
    getOrigin,
    register({ path: route, handler }) {
      routes.set(route, handler)
      return () => routes.delete(route)
    },
  }
  const tools = {
    register(tool) {
      if (tool.name === 'gen_image') resolveTool(tool)
      return () => {}
    },
  }
  const { apply } = await import(pathToFileURL(path.join(root, 'lib', 'index.js')).href)
  apply({
    logger: { warn() {} },
    inject(services, install) {
      if (services[0] === 'webServer') install({ webServer })
      if (services[0] === 'tools') install({ tools })
    },
  })
  const tool = await ready

  async function request(route, { headers = {}, method = 'GET', body, encrypted = false } = {}) {
    const incoming = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
    Object.assign(incoming, {
      url: `${BASE}/${route}`,
      method,
      headers,
      socket: { encrypted },
    })
    const response = {
      status: 0,
      headersSent: false,
      writeHead(status, responseHeaders) {
        this.status = status
        this.headers = responseHeaders
        this.headersSent = true
      },
      end(value) { this.text = value === undefined ? '' : String(value) },
    }
    const handler = routes.get(route.startsWith('api/') ? `${BASE}/api` : `${BASE}/img`)
    await handler(incoming, response)
    return {
      status: response.status,
      body: response.headers?.['content-type']?.startsWith('application/json')
        ? JSON.parse(response.text)
        : response.text,
    }
  }

  return {
    request,
    tool,
    async generate() { return tool.execute({ prompt: 'landscape' }) },
  }
}

async function assertGeneratedOrigin(plugin, expected) {
  const result = await plugin.generate()
  assert.equal(result.ok, true)
  assert.equal(result.images.length, 1)
  const image = result.images[0]
  assert.equal(image.url, `${expected}${BASE}/img/${path.basename(image.file)}`)
  const markdown = plugin.tool.output.render({}, result).map(item => item.text).join('\n')
  assert.ok(markdown.includes(`](${image.url})`))
  return image
}

async function assertGalleryOrigin(plugin, expected, options) {
  const result = await plugin.request('api/gallery', options)
  assert.equal(result.status, 200)
  assert.ok(result.body.items.length > 0)
  for (const item of result.body.items) {
    assert.equal(item.url, `${expected}${BASE}/img/${item.file}`)
  }
  return result.body.items
}

test('old and empty configurations retain the relative fallback before any API request', async t => {
  for (const config of [{}, { publicOrigin: '' }]) {
    const plugin = await createPlugin(t, { config })
    await assertGeneratedOrigin(plugin, '')
    await assertGalleryOrigin(plugin, '')
  }
})

test('publicOrigin overrides learned and host origins, with whitespace and trailing slashes normalized', async t => {
  const plugin = await createPlugin(t, {
    config: { publicOrigin: '  https://images.example.test:8443///  ' },
    getOrigin: () => 'http://127.0.0.1:3080',
  })
  await assertGeneratedOrigin(plugin, 'https://images.example.test:8443')
  await assertGalleryOrigin(plugin, 'https://images.example.test:8443', {
    headers: { host: '192.168.1.2:3088' },
  })
})

test('web.getOrigin remains a fallback for hosts that implement it', async t => {
  const plugin = await createPlugin(t, { getOrigin: () => 'http://127.0.0.1:3080/' })
  await assertGeneratedOrigin(plugin, 'http://127.0.0.1:3080')
  await assertGalleryOrigin(plugin, 'http://127.0.0.1:3080')
})

test('missing, throwing, and invalid getOrigin methods leave generation usable', async t => {
  for (const getOrigin of [
    undefined,
    () => { throw new Error('unavailable') },
    () => undefined,
    () => 'javascript:alert(1)',
  ]) {
    const plugin = await createPlugin(t, { getOrigin })
    await assertGeneratedOrigin(plugin, '')
  }
})

test('API requests learn Android origins and gallery links follow changed ports', async t => {
  const plugin = await createPlugin(t)
  const state = await plugin.request('api/state', { headers: { host: '127.0.0.1:3080' } })
  assert.equal(state.status, 200)
  const first = await assertGeneratedOrigin(plugin, 'http://127.0.0.1:3080')
  const items = await assertGalleryOrigin(plugin, 'http://127.0.0.1:3088', {
    headers: { host: '127.0.0.1:3088' },
  })
  assert.equal(items[0].file, path.basename(first.file))
  await assertGeneratedOrigin(plugin, 'http://127.0.0.1:3088')
})

test('browser API origins replace a loopback host origin and support LAN and IPv6 addresses', async t => {
  const plugin = await createPlugin(t, { getOrigin: () => 'http://127.0.0.1:3080' })
  for (const host of ['192.168.1.20:3088', '[::1]:3088']) {
    const state = await plugin.request('api/state', { headers: { host } })
    assert.equal(state.status, 200)
    await assertGeneratedOrigin(plugin, `http://${host}`)
    await assertGalleryOrigin(plugin, `http://${host}`)
  }
})

test('reverse proxies use the first forwarded host and protocol values', async t => {
  const plugin = await createPlugin(t)
  const headers = {
    host: '127.0.0.1:3080',
    'x-forwarded-host': ' images.example.test:8443, proxy.internal ',
    'x-forwarded-proto': ' https, http ',
  }
  const state = await plugin.request('api/state', { headers })
  assert.equal(state.status, 200)
  await assertGeneratedOrigin(plugin, 'https://images.example.test:8443')
  await assertGalleryOrigin(plugin, 'https://images.example.test:8443', { headers })
})

test('array-valued forwarded headers use the first item and its first proxy value', async t => {
  const plugin = await createPlugin(t)
  const headers = {
    host: '127.0.0.1:3080',
    'x-forwarded-host': [' images.example.test:8443, first.proxy ', 'second.proxy'],
    'x-forwarded-proto': [' https, http ', 'http'],
  }
  const state = await plugin.request('api/state', { headers })
  assert.equal(state.status, 200)
  await assertGeneratedOrigin(plugin, 'https://images.example.test:8443')
  await assertGalleryOrigin(plugin, 'https://images.example.test:8443', { headers })
})

test('direct TLS requests infer HTTPS without proxy headers', async t => {
  const plugin = await createPlugin(t)
  const result = await plugin.request('api/state', {
    headers: { host: 'tavern.example.test' },
    encrypted: true,
  })
  assert.equal(result.status, 200)
  await assertGeneratedOrigin(plugin, 'https://tavern.example.test')
})

test('invalid request origins do not overwrite the last valid API origin', async t => {
  const plugin = await createPlugin(t)
  await plugin.request('api/state', { headers: { host: '127.0.0.1:3080' } })
  const invalidHeaders = [
    {},
    { host: 'invalid host' },
    { host: '127.0.0.1:3080', 'x-forwarded-proto': 'javascript' },
    { host: '127.0.0.1:3080', 'x-forwarded-proto': 'ftp' },
    ...[
      'https://other.example.test',
      'other.example.test/path',
      'name:password@other.example.test',
      'other.example.test?token=secret',
      'other.example.test#fragment',
      'other.example.test\\path',
      'other.\nexample.test',
      'other.example.test:invalid',
      'bad)host.example.test',
      'bad%29host.example.test',
    ].map(host => ({ host: '127.0.0.1:3080', 'x-forwarded-host': host })),
  ]
  for (const headers of invalidHeaders) {
    await plugin.request('api/state', { headers })
    await assertGeneratedOrigin(plugin, 'http://127.0.0.1:3080')
  }
})

test('invalid configured origins fall back without putting credentials or tokens in image URLs', async t => {
  for (const publicOrigin of [
    'javascript:alert(1)',
    'https://name:password@images.example.test',
    'https://images.example.test/path',
    'https://images.example.test?token=secret',
    'https://images.example.test#fragment',
    'http:///images.example.test',
    'http:\\\\images.example.test',
    'https://im\nages.example.test',
    'https://images.example.test:invalid',
    'https://bad)host.example.test',
    'https://bad%29host.example.test',
    3080,
  ]) {
    const plugin = await createPlugin(t, { config: { publicOrigin } })
    await plugin.request('api/state', { headers: { host: '127.0.0.1:3080' } })
    const image = await assertGeneratedOrigin(plugin, 'http://127.0.0.1:3080')
    assert.ok(!image.url.includes('secret'))
    await assertGalleryOrigin(plugin, 'http://127.0.0.1:3080')
  }
})

test('public image requests do not change the learned API origin', async t => {
  const plugin = await createPlugin(t)
  await plugin.request('api/state', { headers: { host: '192.168.1.20:3080' } })
  const image = await assertGeneratedOrigin(plugin, 'http://192.168.1.20:3080')
  const response = await plugin.request(`img/${path.basename(image.file)}`, {
    headers: { host: 'unrelated.example.test' },
    method: 'HEAD',
  })
  assert.equal(response.status, 200)
  await assertGeneratedOrigin(plugin, 'http://192.168.1.20:3080')
})

test('saving publicOrigin takes effect immediately and clearing it restores automatic inference', async t => {
  const plugin = await createPlugin(t)
  const headers = { host: '127.0.0.1:3080' }
  const state = await plugin.request('api/state', { headers })
  for (const publicOrigin of ['https://images.example.test/', '']) {
    const response = await plugin.request('api/save', {
      headers,
      method: 'POST',
      body: { target: 'config', content: { ...state.body.config, publicOrigin } },
    })
    assert.equal(response.status, 200)
    assert.equal(response.body.ok, true)
    const origin = publicOrigin ? 'https://images.example.test' : 'http://127.0.0.1:3080'
    await assertGeneratedOrigin(plugin, origin)
    await assertGalleryOrigin(plugin, origin)
  }
})
