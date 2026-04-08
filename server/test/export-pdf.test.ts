/* @vitest-environment node */

import { writeFile } from 'node:fs/promises'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'

interface ServiceModule {
  createExportService: (port?: number) => {
    server: {
      address: () => { port: number } | string | null
      close: (callback: () => void) => void
    }
    close: () => Promise<void>
  }
}

type ServiceInstance = {
  server: {
    address: () => { port: number } | string | null
    close: (callback: () => void) => void
  }
  close: () => Promise<void>
}

const createPayload = () => ({
  html: '<div>测试导出内容</div>',
  documentCssText: '',
  css: 'body { font-family: serif; }',
  filename: 'test.pdf',
  assetBaseUrl: 'http://127.0.0.1'
})

const getPort = (service: ServiceInstance): number => {
  const address = service.server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve test server port')
  }

  return address.port
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.unmock('node:child_process')
})

describe('export-pdf routes', () => {
  it('rejects weasy export when required params are missing', async () => {
    const mod = await import('../export-pdf') as ServiceModule
    const service = mod.createExportService(0)

    try {
      const port = getPort(service)
      const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf/weasy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'missing.pdf' })
      })

      expect(response.status).toBe(400)
      const payload = await response.json() as { error?: string }
      expect(payload.error).toBe('Missing required parameters')
    } finally {
      await service.close()
    }
  })

  it('returns PDF from weasy endpoint when weasy process succeeds', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: vi.fn((_cmd: string, args: string[]) => {
        const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter }
        child.stderr = new EventEmitter()

        const outputPath = args[2]
        void writeFile(outputPath, '%PDF-1.4\nweasy-mock', 'utf8').then(() => {
          setImmediate(() => {
            child.emit('close', 0)
          })
        })

        return child
      })
    }))

    const mod = await import('../export-pdf') as ServiceModule
    const service = mod.createExportService(0)

    try {
      const port = getPort(service)
      const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf/weasy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload())
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type') ?? '').toContain('application/pdf')
      const body = new Uint8Array(await response.arrayBuffer())
      expect(Array.from(body.slice(0, 5))).toEqual([37, 80, 68, 70, 45])
    } finally {
      await service.close()
    }
  })
})
