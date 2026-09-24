// Disposable PostgreSQL HTTP backend for browser checks. Never uses the development DB.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)
const workspace = resolve(import.meta.dirname, '..')
const backend = resolve(workspace, '../backend')
mkdirSync(resolve(workspace, '.e2e'), { recursive: true })
const temporary = mkdtempSync(resolve(workspace, '.e2e/run-'))
const container = 'sme-frontend-e2e-' + randomUUID().slice(0, 8)
const docker = async (...args) => (await exec('docker', args, { windowsHide: true })).stdout.trim()
let containerId
let port
try {
  containerId = await docker(
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--label',
    'sme.frontend.e2e=true',
    '-e',
    'POSTGRES_PASSWORD=browser-test-only',
    '-e',
    'POSTGRES_DB=sme_e2e_browser',
    '-p',
    '127.0.0.1::5432',
    'postgres:18',
  )
  writeFileSync(resolve(workspace, '.e2e/runtime.json'), JSON.stringify({ containerId }))
  port = (await docker('port', containerId, '5432/tcp')).split(':').at(-1)
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await docker(
        'exec',
        containerId,
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-p',
        '5432',
        '-U',
        'postgres',
        '-d',
        'sme_e2e_browser',
      )
      ready = true
      break
    } catch {
      await new Promise((done) => setTimeout(done, 500))
    }
  }
  if (!ready) throw new Error('The isolated PostgreSQL server did not become ready.')
} catch (error) {
  if (containerId) await docker('rm', '--force', containerId)
  throw error
}
const env = {
  ...process.env,
  APP_ENV: 'testing',
  APP_DEBUG: 'false',
  APP_CONFIG_CACHE: resolve(temporary, 'config.php'),
  DB_CONNECTION: 'pgsql',
  DB_HOST: '127.0.0.1',
  DB_PORT: port,
  DB_DATABASE: 'sme_e2e_browser',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'browser-test-only',
  DB_URL: '',
  CACHE_STORE: 'array',
  SESSION_DRIVER: 'array',
  QUEUE_CONNECTION: 'sync',
  LOG_CHANNEL: 'null',
}
function command(args) {
  return new Promise((done, fail) => {
    const child = spawn('php', args, {
      cwd: backend,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('error', fail)
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(output))))
  })
}
try {
  await command(['artisan', 'migrate', '--force', '--no-interaction'])
  await command(['artisan', 'db:seed', '--force', '--no-interaction'])
  await docker(
    'exec',
    containerId,
    'psql',
    '-U',
    'postgres',
    '-d',
    'sme_e2e_browser',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `INSERT INTO users (name, email, password, role, created_at, updated_at) SELECT fixture.name, fixture.email, users.password, fixture.role, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users CROSS JOIN (VALUES ('Sales Operator', 'sales@example.test', 'SALES'), ('Warehouse Operator', 'warehouse@example.test', 'WAREHOUSE'), ('Delivery Operator', 'delivery@example.test', 'DELIVERY')) AS fixture(name,email,role) WHERE users.id = 1;`,
  )
} catch (error) {
  await docker('rm', '--force', containerId)
  throw error
}
console.log('Isolated PostgreSQL browser-test backend ready.')
const server = spawn(
  'php',
  [
    '-S',
    '127.0.0.1:8011',
    resolve(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'),
  ],
  { cwd: resolve(backend, 'public'), env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
)
server.stderr.on('data', (chunk) => {
  if (/Fatal|Uncaught|Error/i.test(String(chunk))) process.stderr.write(chunk)
})
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.kill()
    process.exit(0)
  })
server.on('exit', (code) => process.exit(code ?? 0))
