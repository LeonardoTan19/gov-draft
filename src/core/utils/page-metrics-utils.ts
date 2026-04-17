import type { CssLength, RuleConfig } from '../../types/rule'

type PageOrientation = NonNullable<RuleConfig['page']['orientation']>
type ConvertibleCssLengthUnit = 'mm' | 'cm' | 'in' | 'pt' | 'px'

type IntegerRatio = { numerator: bigint; denominator: bigint }
type PageDimensionsInBaseUnits = { width: number; height: number }

const DEFAULT_PAGE_SIZE = 'A4'
const DEFAULT_ORIENTATION: PageOrientation = 'portrait'
const DECIMAL_POINT = '.'

export const UNIT = {
  MM: 144_000,
  CM: 1_440_000,
  IN: 3_657_600,
  PT: 50_800,
  PX: 38_100
} as const

export const MM_BASE_UNITS = UNIT.MM

const DEFAULT_PAGE_DIMENSIONS: PageDimensionsInBaseUnits = {
  width: 30_240_000,
  height: 42_768_000
}

const PAGE_SIZE_DIMENSIONS: Record<string, PageDimensionsInBaseUnits> = {
  A4: DEFAULT_PAGE_DIMENSIONS,
  A3: { width: 42_768_000, height: 60_480_000 },
  Letter: { width: 31_089_600, height: 40_233_600 }
}

const CONVERTIBLE_LENGTH_PATTERN = /^(-?(?:\d+\.?\d*|\.\d+))(mm|cm|in|pt|px)$/
const CSS_UNIT_TO_BASE_UNITS: Record<ConvertibleCssLengthUnit, bigint> = {
  mm: BigInt(UNIT.MM),
  cm: BigInt(UNIT.CM),
  in: BigInt(UNIT.IN),
  pt: BigInt(UNIT.PT),
  px: BigInt(UNIT.PX)
}

function divideAndRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    return 0n
  }

  const isNegative = numerator < 0n
  const absNumerator = isNegative ? -numerator : numerator
  const quotient = absNumerator / denominator
  const remainder = absNumerator % denominator
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient

  return isNegative ? -rounded : rounded
}

function parseDecimalToFraction(rawValue: string): IntegerRatio | null {
  const trimmed = rawValue.trim()
  const isNegative = trimmed.startsWith('-')
  const signless = isNegative ? trimmed.slice(1) : trimmed
  const segments = signless.split(DECIMAL_POINT)
  const intPartRaw = segments[0] ?? '0'
  const fractionPartRaw = segments[1] ?? ''
  const intPart = intPartRaw.length > 0 ? intPartRaw : '0'

  if (!/^\d+$/.test(intPart)) {
    return null
  }

  if (fractionPartRaw.length > 0 && !/^\d+$/.test(fractionPartRaw)) {
    return null
  }

  const denominator = 10n ** BigInt(fractionPartRaw.length)
  const integerComponent = BigInt(intPart) * denominator
  const fractionComponent = fractionPartRaw.length > 0 ? BigInt(fractionPartRaw) : 0n
  const unsignedNumerator = integerComponent + fractionComponent

  return {
    numerator: isNegative ? -unsignedNumerator : unsignedNumerator,
    denominator
  }
}

function toBaseUnits(value: number, baseUnitsPerUnit: bigint): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return decimalTextToBaseUnits(String(value), baseUnitsPerUnit)
}

function decimalTextToBaseUnits(decimalText: string, baseUnitsPerUnit: bigint): number {
  const parsedDecimal = parseDecimalToFraction(decimalText)
  if (!parsedDecimal) {
    return 0
  }

  const numerator = parsedDecimal.numerator * baseUnitsPerUnit
  const denominator = parsedDecimal.denominator

  return Number(divideAndRound(numerator, denominator))
}

function formatMmCssLength(baseUnits: number): string {
  const mmValue = baseUnitsToMm(baseUnits)
  return `${mmValue}mm`
}

function parseConvertibleCssLength(value: unknown): { numericText: string; unit: ConvertibleCssLengthUnit } | null {
  if (value === 0 || value === '0') {
    return { numericText: '0', unit: 'px' }
  }

  const matched = String(value).trim().match(CONVERTIBLE_LENGTH_PATTERN)
  if (!matched) {
    return null
  }

  return {
    numericText: matched[1] ?? '0',
    unit: (matched[2] as ConvertibleCssLengthUnit)
  }
}

export function mmToBaseUnits(mm: number): number {
  return toBaseUnits(mm, CSS_UNIT_TO_BASE_UNITS.mm)
}

export function pxToBaseUnits(px: number): number {
  return toBaseUnits(px, CSS_UNIT_TO_BASE_UNITS.px)
}

export function baseUnitsToMm(baseUnits: number): number {
  if (!Number.isFinite(baseUnits)) {
    return 0
  }

  const roundedBaseUnits = Math.round(baseUnits)
  return roundedBaseUnits / MM_BASE_UNITS
}

export function baseUnitsToPx(baseUnits: number): number {
  if (!Number.isFinite(baseUnits)) {
    return 0
  }

  const roundedBaseUnits = Math.round(baseUnits)
  return roundedBaseUnits / UNIT.PX
}

export function cssLengthToBaseUnits(value: CssLength): number {
  const parsed = parseConvertibleCssLength(value)
  if (!parsed) {
    return 0
  }

  return decimalTextToBaseUnits(parsed.numericText, CSS_UNIT_TO_BASE_UNITS[parsed.unit])
}

export function isConvertibleCssLength(value: unknown): boolean {
  return parseConvertibleCssLength(value) !== null
}

function normalizeOrientation(orientation: RuleConfig['page']['orientation']): PageOrientation {
  if (orientation === 'landscape') {
    return 'landscape'
  }

  return DEFAULT_ORIENTATION
}

function normalizeLength(value: CssLength | undefined): string | null {
  if (value === undefined) {
    return null
  }

  const parsed = parseConvertibleCssLength(value)
  if (!parsed) {
    return null
  }

  return value === 0 ? '0' : String(value)
}

export function resolvePageDimensions(
  size: RuleConfig['page']['size'] | undefined,
  orientation: RuleConfig['page']['orientation'],
  dimensions?: RuleConfig['page']['dimensions']
): { width: string; height: string } {
  const normalizedOrientation = normalizeOrientation(orientation)
  const customWidth = normalizeLength(dimensions?.width)
  const customHeight = normalizeLength(dimensions?.height)

  const fallbackBaseUnits = PAGE_SIZE_DIMENSIONS[size ?? DEFAULT_PAGE_SIZE] ?? PAGE_SIZE_DIMENSIONS[DEFAULT_PAGE_SIZE] ?? DEFAULT_PAGE_DIMENSIONS
  const fallbackBase = {
    width: formatMmCssLength(fallbackBaseUnits.width),
    height: formatMmCssLength(fallbackBaseUnits.height)
  }
  const base = customWidth && customHeight
    ? { width: customWidth, height: customHeight }
    : fallbackBase

  if (normalizedOrientation === 'landscape') {
    return {
      width: base.height,
      height: base.width
    }
  }

  return base
}

export function getPageContentHeightPx(page: RuleConfig['page']): number {
  const dimensions = resolvePageDimensions(page.size, page.orientation, page.dimensions)
  const pageHeightBaseUnits = cssLengthToBaseUnits(dimensions.height as CssLength)
  const topBaseUnits = cssLengthToBaseUnits(page.margins.top)
  const bottomBaseUnits = cssLengthToBaseUnits(page.margins.bottom)
  return baseUnitsToPx(pageHeightBaseUnits - topBaseUnits - bottomBaseUnits)
}

export function resolvePdfPageFormatMm(page: RuleConfig['page'] | undefined): {
  orientation: PageOrientation
  width: number
  height: number
} {
  const orientation = normalizeOrientation(page?.orientation)
  const dimensions = resolvePageDimensions(page?.size, orientation, page?.dimensions)

  return {
    orientation,
    width: baseUnitsToMm(cssLengthToBaseUnits(dimensions.width as CssLength)),
    height: baseUnitsToMm(cssLengthToBaseUnits(dimensions.height as CssLength))
  }
}
