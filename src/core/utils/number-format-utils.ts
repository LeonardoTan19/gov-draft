import type { NumberStyle } from '../../types/rule'

const ROMAN_MAP: Array<{ value: number; symbol: string }> = [
  { value: 1000, symbol: 'M' },
  { value: 900, symbol: 'CM' },
  { value: 500, symbol: 'D' },
  { value: 400, symbol: 'CD' },
  { value: 100, symbol: 'C' },
  { value: 90, symbol: 'XC' },
  { value: 50, symbol: 'L' },
  { value: 40, symbol: 'XL' },
  { value: 10, symbol: 'X' },
  { value: 9, symbol: 'IX' },
  { value: 5, symbol: 'V' },
  { value: 4, symbol: 'IV' },
  { value: 1, symbol: 'I' }
]

const ZH_HANS_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const
const ZH_HANT_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'] as const
const ZH_HANS_UNITS = ['', '十', '百', '千'] as const
const ZH_HANT_UNITS = ['', '拾', '佰', '仟'] as const
const SECTION_UNITS = ['', '万', '亿', '兆'] as const

export class NumberFormatUtils {
  static formatByStyle(value: number, style: NumberStyle): string {
    if (!Number.isFinite(value)) {
      return ''
    }

    if (!Number.isInteger(value)) {
      return String(value)
    }

    if (style === 'roman') {
      return this.toRoman(value)
    }

    if (style === 'zhHans') {
      return this.toChinese(value, ZH_HANS_DIGITS, ZH_HANS_UNITS)
    }

    if (style === 'zhHant') {
      return this.toChinese(value, ZH_HANT_DIGITS, ZH_HANT_UNITS)
    }

    return String(value)
  }

  private static toRoman(value: number): string {
    if (value <= 0 || value > 3999) {
      return String(value)
    }

    let remain = value
    let result = ''
    for (const item of ROMAN_MAP) {
      while (remain >= item.value) {
        result += item.symbol
        remain -= item.value
      }
    }

    return result
  }

  private static toChinese(
    value: number,
    digits: readonly string[],
    units: readonly string[]
  ): string {
    if (value === 0) {
      return digits[0] ?? '0'
    }

    const negative = value < 0
    const absValue = Math.abs(value)
    const numText = String(absValue)
    const paddedLength = Math.ceil(numText.length / 4) * 4
    const padded = numText.padStart(paddedLength, '0')
    const sections: string[] = []

    for (let offset = 0; offset < padded.length; offset += 4) {
      sections.push(padded.slice(offset, offset + 4))
    }

    let merged = ''
    let needZeroBetweenSections = false
    sections.forEach((section, index) => {
      const sectionValue = Number(section)
      const unitIndex = sections.length - index - 1

      if (sectionValue === 0) {
        needZeroBetweenSections = merged.length > 0
        return
      }

      if (needZeroBetweenSections && !merged.endsWith(digits[0] ?? '零')) {
        merged += digits[0] ?? '零'
      }

      let sectionText = ''
      let zeroPending = false
      section.split('').forEach((digitChar, digitIndex) => {
        const digit = Number(digitChar)
        const pos = section.length - digitIndex - 1

        if (digit === 0) {
          if (sectionText.length > 0) {
            zeroPending = true
          }
          return
        }

        if (zeroPending && sectionText.length > 0) {
          sectionText += digits[0] ?? '零'
        }

        sectionText += `${digits[digit] ?? String(digit)}${units[pos] ?? ''}`
        zeroPending = false
      })

      merged += `${sectionText}${SECTION_UNITS[unitIndex] ?? ''}`
      needZeroBetweenSections = Number(section.slice(-1)) === 0
    })

    const normalized = merged.replace(/零+/g, '零').replace(/零$/g, '')
    if (!normalized) {
      return digits[0] ?? '0'
    }

    const oneDigit = digits[1] ?? '一'
    const tenUnit = units[1] ?? '十'
    const withoutLeadingOneTen = normalized.startsWith(`${oneDigit}${tenUnit}`)
      ? normalized.slice(tenUnit.length)
      : normalized
    const finalValue = withoutLeadingOneTen || normalized
    return negative ? `负${finalValue}` : finalValue
  }
}
