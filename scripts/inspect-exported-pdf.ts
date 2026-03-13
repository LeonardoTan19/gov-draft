import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

interface InspectOptions {
  filePath: string
  json: boolean
  requireText: boolean
}

interface PageInspection {
  pageNumber: number
  itemCount: number
  textLength: number
  preview: string
}

interface InspectionResult {
  filePath: string
  fileSize: number
  pageCount: number
  textLength: number
  hasTextLayer: boolean
  pages: PageInspection[]
}

const HELP_TEXT = `Usage:
  pnpm pdf:inspect -- <path-to-pdf> [--json] [--allow-empty]

Examples:
  pnpm pdf:inspect -- ./exports/demo.pdf
  pnpm pdf:inspect -- ./exports/demo.pdf --json

Behavior:
  - Exits with code 0 when the PDF can be parsed and text can be extracted.
  - Exits with code 2 when the file is not a valid or readable PDF.
  - Exits with code 3 when the PDF is readable but no text content is extracted.
`

const parseArgs = (argv: string[]): InspectOptions => {
  const normalizedArgs = argv.filter((arg) => arg !== '--')
  const positional = normalizedArgs.filter((arg) => !arg.startsWith('--'))
  const filePath = positional[0]

  if (normalizedArgs.includes('--help') || normalizedArgs.includes('-h')) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  if (!filePath) {
    console.log(HELP_TEXT)
    process.exit(1)
  }

  return {
    filePath,
    json: normalizedArgs.includes('--json'),
    requireText: !normalizedArgs.includes('--allow-empty')
  }
}

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim()
}

const inspectPdf = async (options: InspectOptions): Promise<InspectionResult> => {
  const fileBuffer = await readFile(options.filePath)

  if (fileBuffer.byteLength < 5 || fileBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('File does not start with a valid PDF header')
  }

  const loadingTask = getDocument({
    data: new Uint8Array(fileBuffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true
  })

  const pdfDocument = await loadingTask.promise
  const pages: PageInspection[] = []
  let totalTextLength = 0

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const joinedText = normalizeWhitespace(
      textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((value) => value.length > 0)
        .join(' ')
    )

    totalTextLength += joinedText.length

    pages.push({
      pageNumber,
      itemCount: textContent.items.length,
      textLength: joinedText.length,
      preview: joinedText.slice(0, 120)
    })
  }

  await pdfDocument.destroy()

  return {
    filePath: options.filePath,
    fileSize: fileBuffer.byteLength,
    pageCount: pages.length,
    textLength: totalTextLength,
    hasTextLayer: totalTextLength > 0,
    pages
  }
}

const printHumanReadable = (result: InspectionResult): void => {
  console.log(`PDF: ${result.filePath}`)
  console.log(`Size: ${result.fileSize} bytes`)
  console.log(`Pages: ${result.pageCount}`)
  console.log(`Text length: ${result.textLength}`)
  console.log(`Has extractable text: ${result.hasTextLayer ? 'yes' : 'no'}`)

  result.pages.forEach((page) => {
    console.log(`Page ${page.pageNumber}: items=${page.itemCount}, textLength=${page.textLength}`)
    console.log(`Preview: ${page.preview || '[empty]'}`)
  })
}

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2))

  try {
    const result = await inspectPdf(options)

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      printHumanReadable(result)
    }

    if (options.requireText && !result.hasTextLayer) {
      console.error('PDF can be parsed, but no extractable text was found.')
      process.exitCode = 3
    }
  } catch (error) {
    console.error('Failed to inspect PDF:', error instanceof Error ? error.message : String(error))
    process.exitCode = 2
  }
}

void main()