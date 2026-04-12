export const DEFAULT_STYLE_WRAPPER_TAG_NAMES = new Set(['DIV', 'SECTION', 'ARTICLE'])
export const DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME = 'local-style-container'

export interface CollectBlocksOptions {
  styleWrapperTagNames?: ReadonlySet<string>
  localStyleContainerClassName?: string
}

const applyInheritedClassNames = (element: Element, classNames: ReadonlySet<string>): void => {
  classNames.forEach((className) => {
    element.classList.add(className)
  })
}

export function parseInlineStyle(styleText: string): Array<[string, string]> {
  return styleText
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration.length > 0)
    .reduce<Array<[string, string]>>((acc, declaration) => {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex <= 0) {
        return acc
      }

      const property = declaration.slice(0, separatorIndex).trim()
      const value = declaration.slice(separatorIndex + 1).trim()
      if (!property || !value) {
        return acc
      }

      acc.push([property, value])
      return acc
    }, [])
}

export function mergeInlineStyleText(baseStyleText: string, extensionStyleText: string): string {
  const declarations = new Map<string, string>()

  for (const [property, value] of parseInlineStyle(baseStyleText)) {
    declarations.set(property, value)
  }

  for (const [property, value] of parseInlineStyle(extensionStyleText)) {
    if (declarations.has(property)) {
      declarations.delete(property)
    }
    declarations.set(property, value)
  }

  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ')
}

export function applyMergedInlineStyle(element: Element, mergedStyleText: string): void {
  const normalized = mergedStyleText.trim()
  if (normalized.length === 0) {
    element.removeAttribute('style')
    return
  }

  element.setAttribute('style', normalized)
}

function collectBlocksFromNode(
  node: Node,
  inheritedStyleText: string,
  inheritedClassNames: ReadonlySet<string>,
  acc: string[],
  options: Required<CollectBlocksOptions>
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? ''
    if (text.length > 0) {
      const paragraph = document.createElement('p')
      paragraph.textContent = text
      applyMergedInlineStyle(paragraph, inheritedStyleText)
      applyInheritedClassNames(paragraph, inheritedClassNames)
      acc.push(paragraph.outerHTML)
    }
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return
  }

  const element = node as Element
  const ownStyleText = element.getAttribute('style') ?? ''
  const mergedStyleText = mergeInlineStyleText(inheritedStyleText, ownStyleText)
  const mergedClassNames = new Set(inheritedClassNames)

  if (element.classList.contains(options.localStyleContainerClassName)) {
    mergedClassNames.add(options.localStyleContainerClassName)
  }

  if (options.styleWrapperTagNames.has(element.tagName.toUpperCase())) {
    const childNodes = Array.from(element.childNodes)
    childNodes.forEach((child) => {
      collectBlocksFromNode(child, mergedStyleText, mergedClassNames, acc, options)
    })
    return
  }

  const cloned = element.cloneNode(true) as Element
  applyMergedInlineStyle(cloned, mergedStyleText)
  applyInheritedClassNames(cloned, mergedClassNames)
  acc.push(cloned.outerHTML)
}

export function collectBlocks(html: string, options: CollectBlocksOptions = {}): string[] {
  const resolvedOptions: Required<CollectBlocksOptions> = {
    styleWrapperTagNames: options.styleWrapperTagNames ?? DEFAULT_STYLE_WRAPPER_TAG_NAMES,
    localStyleContainerClassName: options.localStyleContainerClassName ?? DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const blocks: string[] = []
  Array.from(container.childNodes).forEach((node) => {
    collectBlocksFromNode(node, '', new Set<string>(), blocks, resolvedOptions)
  })

  return blocks
}
