import { describe, expect, it } from 'vitest'
import type { PageConfig } from '../../../types/rule'
import {
  UNIT,
  baseUnitsToMm,
  baseUnitsToPx,
  cssLengthToBaseUnits,
  isConvertibleCssLength,
  mmToBaseUnits,
  pxToBaseUnits,
  resolvePageDimensions,
  resolvePdfPageFormatMm
} from '../page-metrics-utils'

describe('page-metrics-utils', () => {
  it('defines standard base UNIT constants', () => {
    expect(UNIT.MM).toBe(144000)
    expect(UNIT.CM).toBe(1440000)
    expect(UNIT.IN).toBe(3657600)
    expect(UNIT.PT).toBe(50800)
    expect(UNIT.PX).toBe(38100)
  })

  it('exposes named base-unit conversion APIs', () => {
    expect(mmToBaseUnits(1)).toBe(144000)
    expect(pxToBaseUnits(96)).toBe(3657600)
    expect(baseUnitsToMm(144000)).toBe(1)
    expect(baseUnitsToPx(144000)).toBeCloseTo(96 / 25.4, 10)
  })

  it('converts css length to integer base units', () => {
    expect(cssLengthToBaseUnits('1mm')).toBe(144000)
    expect(cssLengthToBaseUnits('1cm')).toBe(1440000)
    expect(cssLengthToBaseUnits('1in')).toBe(3657600)
  })

  it('converts through base units for px and mm output', () => {
    expect(baseUnitsToPx(cssLengthToBaseUnits('1mm'))).toBeCloseTo(96 / 25.4, 10)
    expect(baseUnitsToMm(cssLengthToBaseUnits('96px'))).toBeCloseTo(25.4, 10)
  })

  it('checks whether css length is convertible by base unit rules', () => {
    expect(isConvertibleCssLength('16px')).toBe(true)
    expect(isConvertibleCssLength('2em')).toBe(false)
  })

  it('resolves named page size from UNIT-based constants', () => {
    const dimensions = resolvePageDimensions('Letter', 'portrait')

    expect(dimensions.width).toBe('215.9mm')
    expect(dimensions.height).toBe('279.4mm')
  })

  it('resolves default PDF format to A4 portrait mm dimensions', () => {
    const format = resolvePdfPageFormatMm(undefined)

    expect(format.orientation).toBe('portrait')
    expect(format.width).toBeCloseTo(210, 10)
    expect(format.height).toBeCloseTo(297, 10)
  })

  it('resolves custom dimensions and applies landscape swap', () => {
    const page: PageConfig = {
      size: 'A4',
      orientation: 'landscape',
      dimensions: {
        width: '200mm',
        height: '100mm'
      },
      margins: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    }

    const format = resolvePdfPageFormatMm(page)

    expect(format.orientation).toBe('landscape')
    expect(format.width).toBeCloseTo(100, 10)
    expect(format.height).toBeCloseTo(200, 10)
  })
})
