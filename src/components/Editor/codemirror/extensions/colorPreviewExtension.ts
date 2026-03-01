import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';

const SUGAR_OPEN_PATTERN = /^\s*:::\s+\S/;
const SUGAR_CLOSE_PATTERN = /^\s*:::\s*$/;
const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const COLOR_HOVER_OPEN_DELAY_MS = 50;
const COLOR_INPUT_WRITEBACK_INTERVAL_MS = 20;

function normalizeHexToColorInputValue(color: string): string {
  const normalized = color.toLowerCase();
  const isShortHex = normalized.length === 4 || normalized.length === 5;

  if (isShortHex) {
    const red = normalized[1];
    const green = normalized[2];
    const blue = normalized[3];
    return `#${red}${red}${green}${green}${blue}${blue}`;
  }

  if (normalized.length === 9) {
    return normalized.slice(0, 7);
  }

  return normalized;
}

function extractAlphaHex(color: string): string | null {
  const normalized = color.toLowerCase();

  if (normalized.length === 5) {
    return `${normalized[4]}${normalized[4]}`;
  }

  if (normalized.length === 9) {
    return normalized.slice(7, 9);
  }

  return null;
}

function resolveCurrentHexRange(state: EditorView['state'], anchorFrom: number): {
  from: number;
  to: number;
  colorText: string;
} | null {
  const safeAnchor = Math.min(Math.max(anchorFrom, 0), state.doc.length);
  const line = state.doc.lineAt(safeAnchor);
  HEX_COLOR_PATTERN.lastIndex = 0;

  let nearestMatch: { from: number; to: number; colorText: string; distance: number } | null = null;
  let matched = HEX_COLOR_PATTERN.exec(line.text);

  while (matched) {
    const colorText = matched[0];
    const from = line.from + matched.index;
    const to = from + colorText.length;

    if (safeAnchor >= from && safeAnchor <= to) {
      return { from, to, colorText };
    }

    const distance = Math.abs(safeAnchor - from);
    if (!nearestMatch || distance < nearestMatch.distance) {
      nearestMatch = { from, to, colorText, distance };
    }

    matched = HEX_COLOR_PATTERN.exec(line.text);
  }

  if (!nearestMatch) {
    return null;
  }

  return {
    from: nearestMatch.from,
    to: nearestMatch.to,
    colorText: nearestMatch.colorText
  };
}

function isColorPickerInputActive(view: EditorView): boolean {
  const activeElement = view.dom.ownerDocument.activeElement;
  return (
    activeElement instanceof HTMLInputElement &&
    activeElement.classList.contains('cm-color-picker-input')
  );
}

class ColorPreviewWidget extends WidgetType {
  private hoverTimer: number | null = null;
  private writebackTimer: number | null = null;
  private queuedColor: string | null = null;
  private lastWritebackAt = 0;
  private lastDispatchedColor: string | null = null;
  private readonly view: EditorView;
  private readonly from: number;
  private readonly initialColor: string;

  constructor(view: EditorView, from: number, colorText: string) {
    super();
    this.view = view;
    this.from = from;
    this.initialColor = colorText;
  }

  eq(other: ColorPreviewWidget): boolean {
    return (
      this.from === other.from &&
      this.initialColor.toLowerCase() === other.initialColor.toLowerCase()
    );
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
      this.writebackTimer = null;
    }
    this.queuedColor = null;
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span');
    container.className = 'cm-color-preview';

    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'cm-color-swatch';
    swatch.style.backgroundColor = this.initialColor;

    const colorInput = document.createElement('input');
    colorInput.className = 'cm-color-picker-input';
    colorInput.type = 'color';
    colorInput.value = normalizeHexToColorInputValue(this.initialColor);

    const openPicker = (): void => {
      colorInput.focus({ preventScroll: true });
      if (typeof colorInput.showPicker === 'function') {
        try {
          colorInput.showPicker();
        } catch {
          colorInput.click();
        }
        return;
      }
      colorInput.click();
    };

    const clearHoverTimer = (): void => {
      if (this.hoverTimer !== null) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    };

    swatch.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPicker();
    });

    swatch.addEventListener('mouseenter', () => {
      clearHoverTimer();
      this.hoverTimer = window.setTimeout(() => {
        this.hoverTimer = null;
        openPicker();
      }, COLOR_HOVER_OPEN_DELAY_MS);
    });

    swatch.addEventListener('mouseleave', () => {
      clearHoverTimer();
    });

    const dispatchColorChange = (nextColor: string): void => {
      const currentRange = resolveCurrentHexRange(this.view.state, this.from);
      if (!currentRange) {
        return;
      }
      if (nextColor === this.lastDispatchedColor) {
        return;
      }
      this.lastDispatchedColor = nextColor;
      swatch.style.backgroundColor = nextColor;
      this.view.dispatch({
        changes: {
          from: currentRange.from,
          to: currentRange.to,
          insert: nextColor
        }
      });
    };

    const resolveNextColor = (): string | null => {
      const currentRange = resolveCurrentHexRange(this.view.state, this.from);
      if (!currentRange) {
        return null;
      }
      const nextBaseColor = colorInput.value.toLowerCase();
      const alpha = extractAlphaHex(currentRange.colorText);
      return alpha ? `${nextBaseColor}${alpha}` : nextBaseColor;
    };

    const scheduleThrottledWriteback = (nextColor: string): void => {
      const now = performance.now();
      const elapsed = now - this.lastWritebackAt;

      if (this.writebackTimer === null && elapsed >= COLOR_INPUT_WRITEBACK_INTERVAL_MS) {
        dispatchColorChange(nextColor);
        this.lastWritebackAt = performance.now();
        return;
      }

      this.queuedColor = nextColor;
      if (this.writebackTimer !== null) {
        return;
      }

      const wait = Math.max(COLOR_INPUT_WRITEBACK_INTERVAL_MS - elapsed, 0);
      this.writebackTimer = window.setTimeout(() => {
        this.writebackTimer = null;
        const queued = this.queuedColor;
        this.queuedColor = null;
        if (!queued) {
          return;
        }
        dispatchColorChange(queued);
        this.lastWritebackAt = performance.now();
      }, wait);
    };

    const flushImmediateWriteback = (): void => {
      if (this.writebackTimer !== null) {
        clearTimeout(this.writebackTimer);
        this.writebackTimer = null;
      }
      this.queuedColor = null;
      const nextColor = resolveNextColor();
      if (!nextColor) {
        return;
      }
      dispatchColorChange(nextColor);
      this.lastWritebackAt = performance.now();
    };

    colorInput.addEventListener('input', () => {
      const nextColor = resolveNextColor();
      if (!nextColor) {
        return;
      }
      scheduleThrottledWriteback(nextColor);
    });

    colorInput.addEventListener('change', () => {
      flushImmediateWriteback();
    });

    container.append(swatch, colorInput);
    return container;
  }
}

function buildColorPreviewDecorations(state: EditorView['state'], view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let sugarDepth = 0;

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const isOpen = SUGAR_OPEN_PATTERN.test(line.text);
    const isClose = SUGAR_CLOSE_PATTERN.test(line.text) && sugarDepth > 0;
    const isInSugar = isOpen || sugarDepth > 0 || isClose;

    if (isInSugar) {
      HEX_COLOR_PATTERN.lastIndex = 0;
      let matched = HEX_COLOR_PATTERN.exec(line.text);

      while (matched) {
        const colorText = matched[0];
        const from = line.from + matched.index;

        builder.add(
          from,
          from,
          Decoration.widget({
            side: -1,
            widget: new ColorPreviewWidget(view, from, colorText)
          })
        );

        matched = HEX_COLOR_PATTERN.exec(line.text);
      }
    }

    if (isOpen) {
      sugarDepth += 1;
      continue;
    }

    if (isClose) {
      sugarDepth -= 1;
    }
  }

  return builder.finish();
}

class ColorPreviewViewPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = buildColorPreviewDecorations(view.state, view);
  }

  update(update: ViewUpdate): void {
    if (!update.docChanged && !update.viewportChanged) {
      return;
    }

    if (update.docChanged) {
      this.decorations = this.decorations.map(update.changes);
    }

    const shouldRebuild =
      update.viewportChanged || (update.docChanged && !isColorPickerInputActive(update.view));

    if (shouldRebuild) {
      this.decorations = buildColorPreviewDecorations(update.view.state, update.view);
    }
  }
}

const colorPreviewPlugin = ViewPlugin.fromClass(ColorPreviewViewPlugin, {
  decorations: (plugin) => plugin.decorations
});

export function createColorPreviewExtension(): Extension {
  return [colorPreviewPlugin];
}
