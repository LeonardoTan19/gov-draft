import type {
  ContentItemConfig,
  PaginationConfig,
  RuleConfig,
  SectionPaginationConfig,
  TextAlign
} from '../types/rule'

export interface ContentLevelForm {
  key: string
  item: ContentItemConfig
  sectionStyle?: string
}

export interface SectionPageOverrideForm {
  enabled: boolean
  size: string
  orientation: 'portrait' | 'landscape'
  margins: {
    top: string
    right: string
    bottom: string
    left: string
  }
}

export interface SectionParserOverrideForm {
  enabled: boolean
  headingNumbering: boolean
  enterStyle: 'paragraph' | 'lineBreak'
  linkify: boolean
  typographer: boolean
  disabledSyntax: string
}

export interface PaginationSectionForm {
  key: string
  page: SectionPageOverrideForm
  parser: SectionParserOverrideForm
  pagination: PaginationConfig & { enabled: boolean }
}

export interface RuleSettingsFormModel {
  name: string
  version: string
  parser: {
    headingNumbering: boolean
    enterStyle: 'paragraph' | 'lineBreak'
    linkify: boolean
    typographer: boolean
    disabledSyntax: string
  }
  page: {
    size: string
    orientation: 'portrait' | 'landscape'
    margins: {
      top: string
      right: string
      bottom: string
      left: string
    }
    paginationEnabled: boolean
  }
  contentLevels: ContentLevelForm[]
  paginationSections: PaginationSectionForm[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeStringArray(input: string): string[] {
  const values = input
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return Array.from(new Set(values))
}

function toFormLength(value: unknown): string {
  return String(value ?? '')
}

function toCssLength(value: string): RuleConfig['page']['margins']['top'] {
  const normalized = value.trim()
  if (normalized.length === 0) {
    return '0'
  }

  if (normalized === '0') {
    return '0'
  }

  return normalized as RuleConfig['page']['margins']['top']
}

export function createDefaultContentItem(): ContentItemConfig {
  return {
    fonts: {
      latinFamily: 'Times New Roman, serif',
      cjkFamily: '仿宋_GB2312, FangSong, STFangsong, serif'
    },
    style: {
      size: '16pt',
      weight: 400,
      colors: {
        text: '#000000',
        background: '#ffffff'
      }
    },
    paragraph: {
      align: 'left' as TextAlign,
      indent: '0',
      spacing: {
        lineHeight: '1.5',
        before: '0',
        after: '0'
      }
    }
  }
}

export function createDefaultPaginationSectionForm(index = 1): PaginationSectionForm {
  return {
    key: `section${index}`,
    page: {
      enabled: false,
      size: 'A4',
      orientation: 'portrait',
      margins: {
        top: '37mm',
        right: '26mm',
        bottom: '35mm',
        left: '28mm'
      }
    },
    parser: {
      enabled: false,
      headingNumbering: true,
      enterStyle: 'paragraph',
      linkify: true,
      typographer: true,
      disabledSyntax: ''
    },
    pagination: {
      enabled: true,
      format: '— {currentPage} / {totalPage} —',
      numberStyle: 'arabic',
      style: {
        fonts: {
          latinFamily: 'Times New Roman, serif',
          cjkFamily: '仿宋_GB2312, FangSong, STFangsong, serif'
        },
        size: '14pt',
        weight: 400,
        colors: {
          text: '#000000'
        }
      },
      position: {
        vertical: {
          anchor: 'bottom',
          offset: '7mm'
        },
        horizontal: {
          anchor: 'center',
          offset: '0mm'
        }
      }
    }
  }
}

export function toRuleSettingsForm(rule: RuleConfig): RuleSettingsFormModel {
  const contentLevels = Object.entries(rule.content).map(([key, value]) => {
    const item = clone(value)
    const level: ContentLevelForm = {
      key,
      item
    }

    if (key === 'h1' && 'sectionStyle' in value) {
      level.sectionStyle = typeof value.sectionStyle === 'string' ? value.sectionStyle : ''
    }

    return level
  })

  const paginationSections = Object.entries(rule.paginationSections ?? {}).map<PaginationSectionForm>(([key, sectionValue]) => {
    const section = clone(sectionValue)

    return {
      key,
      page: {
        enabled: Boolean(section.page),
        size: section.page?.size ?? 'A4',
        orientation: section.page?.orientation ?? 'portrait',
        margins: {
          top: toFormLength(section.page?.margins?.top ?? '37mm'),
          right: toFormLength(section.page?.margins?.right ?? '26mm'),
          bottom: toFormLength(section.page?.margins?.bottom ?? '35mm'),
          left: toFormLength(section.page?.margins?.left ?? '28mm')
        }
      },
      parser: {
        enabled: Boolean(section.parser),
        headingNumbering: section.parser?.headingNumbering ?? true,
        enterStyle: section.parser?.enterStyle === 'lineBreak' ? 'lineBreak' : 'paragraph',
        linkify: section.parser?.linkify ?? true,
        typographer: section.parser?.typographer ?? true,
        disabledSyntax: (section.parser?.disabledSyntax ?? []).join(', ')
      },
      pagination: {
        ...section.pagination,
        enabled: section.pagination.enabled !== false
      }
    }
  })

  return {
    name: rule.name,
    version: rule.version,
    parser: {
      headingNumbering: rule.parser.headingNumbering !== false,
      enterStyle: rule.parser.enterStyle === 'lineBreak' ? 'lineBreak' : 'paragraph',
      linkify: rule.parser.linkify !== false,
      typographer: rule.parser.typographer !== false,
      disabledSyntax: (rule.parser.disabledSyntax ?? []).join(', ')
    },
    page: {
      size: rule.page.size ?? 'A4',
      orientation: rule.page.orientation === 'landscape' ? 'landscape' : 'portrait',
      margins: {
        top: toFormLength(rule.page.margins.top),
        right: toFormLength(rule.page.margins.right),
        bottom: toFormLength(rule.page.margins.bottom),
        left: toFormLength(rule.page.margins.left)
      },
      paginationEnabled: rule.page.pagination?.enabled === true
    },
    contentLevels,
    paginationSections
  }
}

export function toRuleConfig(form: RuleSettingsFormModel, sourceRule: RuleConfig): RuleConfig {
  const nextContent = form.contentLevels.reduce<RuleConfig['content']>((acc, level) => {
    const item = clone(level.item)

    if (level.key === 'h1') {
      acc[level.key] = {
        ...item,
        sectionStyle: level.sectionStyle?.trim() || undefined
      }
      return acc
    }

    acc[level.key] = item
    return acc
  }, {} as RuleConfig['content'])

  const nextPaginationSections = form.paginationSections.reduce<Record<string, SectionPaginationConfig>>((acc, section) => {
    if (section.key.trim().length === 0) {
      return acc
    }

    const sectionConfig: SectionPaginationConfig = {
      pagination: {
        ...clone(section.pagination),
        enabled: section.pagination.enabled
      }
    }

    if (section.page.enabled) {
      sectionConfig.page = {
        size: section.page.size,
        orientation: section.page.orientation,
        margins: {
          top: toCssLength(section.page.margins.top),
          right: toCssLength(section.page.margins.right),
          bottom: toCssLength(section.page.margins.bottom),
          left: toCssLength(section.page.margins.left)
        }
      }
    }

    if (section.parser.enabled) {
      sectionConfig.parser = {
        headingNumbering: section.parser.headingNumbering,
        enterStyle: section.parser.enterStyle,
        linkify: section.parser.linkify,
        typographer: section.parser.typographer,
        disabledSyntax: normalizeStringArray(section.parser.disabledSyntax)
      }
    }

    acc[section.key.trim()] = sectionConfig
    return acc
  }, {} as NonNullable<RuleConfig['paginationSections']>)

  return {
    ...sourceRule,
    name: form.name,
    version: form.version,
    content: nextContent,
    page: {
      ...sourceRule.page,
      size: form.page.size,
      orientation: form.page.orientation,
      margins: {
        top: toCssLength(form.page.margins.top),
        right: toCssLength(form.page.margins.right),
        bottom: toCssLength(form.page.margins.bottom),
        left: toCssLength(form.page.margins.left)
      },
      pagination: {
        enabled: form.page.paginationEnabled
      }
    },
    parser: {
      ...sourceRule.parser,
      headingNumbering: form.parser.headingNumbering,
      enterStyle: form.parser.enterStyle,
      linkify: form.parser.linkify,
      typographer: form.parser.typographer,
      disabledSyntax: normalizeStringArray(form.parser.disabledSyntax)
    },
    paginationSections: nextPaginationSections
  }
}
