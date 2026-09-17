import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)
export default async function cleanup() {
  const runtime = resolve(import.meta.dirname, '../.e2e/runtime.json')
  if (!existsSync(runtime)) return
  const { containerId } = JSON.parse(readFileSync(runtime, 'utf8'))
  if (!/^[a-f0-9]{64}$/.test(containerId)) throw new Error('Unexpected test container ID.')
  const { stdout } = await exec('docker', ['inspect', containerId], { windowsHide: true })
  const container = JSON.parse(stdout)[0]
  if (
    container.Config.Labels['sme.frontend.e2e'] !== 'true' ||
    !container.Name.startsWith('/sme-frontend-e2e-')
  )
    throw new Error('Refusing to remove a container that is not owned by these tests.')
  await exec('docker', ['rm', '--force', containerId], { windowsHide: true })
  unlinkSync(runtime)
}
