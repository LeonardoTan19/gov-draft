/**
 * WeasyPrint PDF Export Service
 * 提供带文字层的 PDF 导出功能
 */

import path from 'node:path'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import express, { type Request, type Response } from 'express'

interface ExportPdfRequest {
  html: string
  documentCssText?: string
  css: string
  filename: string
  debug?: boolean
  assetBaseUrl?: string
  pageSize?: string
  pageOrientation?: 'portrait' | 'landscape'
}

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const publicFontsDirectory = path.resolve(serverDirectory, '../public/fonts')
const weasyScriptPath = path.resolve(serverDirectory, './weasy-export.py')
const weasyPythonPath = path.resolve(serverDirectory, '../.venv-pdf/bin/python')

/**
 * 创建 PDF 导出服务
 * @param port - 服务端口
 * @returns Express 应用实例
 */
export function createExportService(port: number = 3001) {
  const app = express()

  app.use('/fonts', express.static(publicFontsDirectory))

  // 解析 JSON 请求体
  app.use(express.json({ limit: '10mb' }))

  // 健康检查端点
  app.get('/api/export/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'pdf-export' })
  })

  /**
   * WeasyPrint PDF 导出端点（优先用于文字层与字体保真）
   */
  app.post('/api/export/pdf/weasy', async (req: Request, res: Response) => {
    const {
      html,
      documentCssText = '',
      css,
      filename,
      debug = false,
      assetBaseUrl,
      pageSize,
      pageOrientation
    }: ExportPdfRequest = req.body

    if (typeof html !== 'string' || !/\S/.test(html) || !filename) {
      res.status(400).json({ error: 'Missing required parameters' })
      return
    }

    const workingDirectory = await mkdtemp(path.join(tmpdir(), 'gov-draft-weasy-'))
    const inputPath = path.join(workingDirectory, 'input.json')
    const outputPath = path.join(workingDirectory, 'output.pdf')
    const baseUrl = assetBaseUrl && assetBaseUrl.trim().length > 0
      ? assetBaseUrl
      : `http://127.0.0.1:${port}`

    try {
      await writeFile(inputPath, JSON.stringify({
        html,
        documentCssText,
        css,
        baseUrl,
        debug,
        pageSize,
        pageOrientation
      }), 'utf8')

      await runWeasyExport(inputPath, outputPath)

      const pdfBuffer = await readFile(outputPath)
      if (pdfBuffer.length === 0) {
        throw new Error('WeasyPrint generated empty PDF buffer')
      }

      if (debug) {
        console.info('[export-debug][server][weasy] Generated PDF buffer', {
          bufferLength: pdfBuffer.length,
          filename
        })
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      res.send(pdfBuffer)
    } catch (error) {
      console.error('WeasyPrint export error:', error)
      res.status(500).json({
        error: 'Failed to export PDF by weasyprint',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      await rm(workingDirectory, { recursive: true, force: true })
    }
  })

  /**
   * 启动服务
   */
  const server = app.listen(port, () => {
    console.log(`PDF export service is running on port ${port}`)
    console.log(`Health check: http://localhost:${port}/api/export/health`)
    console.log(`Export endpoint: http://localhost:${port}/api/export/pdf/weasy`)
  })

  return {
    app,
    server,
    close: () => {
      return new Promise<void>((resolve) => {
        server.close(() => {
          console.log('PDF export service stopped')
          resolve()
        })
      })
    }
  }
}

const runWeasyExport = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(weasyPythonPath, [weasyScriptPath, inputPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderrText = ''
    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString()
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to start weasyprint process: ${error.message}`))
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`WeasyPrint process exited with code ${code}: ${stderrText.trim()}`))
    })
  })
}

// 如果直接运行此文件，启动服务
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PDF_EXPORT_PORT || '3001', 10)
  createExportService(port)
}
