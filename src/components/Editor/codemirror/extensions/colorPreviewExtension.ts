import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { setSugarHoveredLineEffect } from './sugarFoldExtension';
import { clearLockedSugarLine, setLockedSugarLine } from './sugarHoverLock';

const SUGAR_OPEN_PATTERN = /^\s*:::\s+\S/;
const SUGAR_CLOSE_PATTERN = /^\s*:::\s*$/;
const COLOR_TOKEN_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^\n\r)]*\)|hsla?\([^\n\r)]*\)/gi;
const COLOR_INPUT_WRITEBACK_INTERVAL_MS = 20;
const COLOR_HOVER_OPEN_DELAY_MS = 180;
const COLOR_HOVER_CLOSE_DELAY_MS = 250;

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type HsvaColor = {
  h: number;
  s: number;
  v: number;
  a: number;
};

type HexShell = {
  kind: 'hex';
  digits: 3 | 4 | 6 | 8;
  uppercase: boolean;
};

type RgbShell = {
  kind: 'rgb';
  fnName: 'rgb' | 'rgba';
  channelIsPercent: [boolean, boolean, boolean];
  alphaIsPercent: boolean;
};

type HslShell = {
  kind: 'hsl';
  fnName: 'hsl' | 'hsla';
  alphaIsPercent: boolean;
};

type ColorShell = HexShell | RgbShell | HslShell;

type ParsedColorToken = {
  rgba: RgbaColor;
  shell: ColorShell;
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toByteHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function toNibbleHex(value: number): string {
  const nibble = clamp(Math.round(clamp(value, 0, 255) / 17), 0, 15);
  return nibble.toString(16);
}

function parseHexColor(text: string): ParsedColorToken | null {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(text)) {
    return null;
  }

  const payload = text.slice(1);
  const digits = payload.length;
  if (digits !== 3 && digits !== 4 && digits !== 6 && digits !== 8) {
    return null;
  }

  const expanded =
    digits === 3 || digits === 4
      ? payload
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : payload;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;

  if ([red, green, blue, alpha].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    rgba: {
      r: clamp(red, 0, 255),
      g: clamp(green, 0, 255),
      b: clamp(blue, 0, 255),
      a: clamp(alpha, 0, 1)
    },
    shell: {
      kind: 'hex',
      digits: digits as 3 | 4 | 6 | 8,
      uppercase: /[A-F]/.test(payload)
    }
  };
}

function parseRgbChannel(raw: string): { value: number; isPercent: boolean } | null {
  const token = raw.trim();
  if (!token) {
    return null;
  }
  if (token.endsWith('%')) {
    const percentValue = Number.parseFloat(token.slice(0, -1));
    if (Number.isNaN(percentValue)) {
      return null;
    }
    return {
      value: clamp((percentValue / 100) * 255, 0, 255),
      isPercent: true
    };
  }
  const numericValue = Number.parseFloat(token);
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return {
    value: clamp(numericValue, 0, 255),
    isPercent: false
  };
}

function parseAlphaChannel(raw: string): { value: number; isPercent: boolean } | null {
  const token = raw.trim();
  if (!token) {
    return null;
  }
  if (token.endsWith('%')) {
    const percentValue = Number.parseFloat(token.slice(0, -1));
    if (Number.isNaN(percentValue)) {
      return null;
    }
    return {
      value: clamp(percentValue / 100, 0, 1),
      isPercent: true
    };
  }
  const numericValue = Number.parseFloat(token);
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return {
    value: clamp(numericValue, 0, 1),
    isPercent: false
  };
}

function parseRgbColor(text: string): ParsedColorToken | null {
  const matched = text.match(/^(rgba?)\((.*)\)$/i);
  if (!matched) {
    return null;
  }

  const fnToken = matched[1];
  const argsToken = matched[2];
  if (!fnToken || argsToken === undefined) {
    return null;
  }

  const fnName = fnToken.toLowerCase() as 'rgb' | 'rgba';
  const args = argsToken.split(',').map((arg) => arg.trim());
  const expectedLength = fnName === 'rgba' ? 4 : 3;
  if (args.length !== expectedLength) {
    return null;
  }

  const redArg = args[0];
  const greenArg = args[1];
  const blueArg = args[2];
  if (redArg === undefined || greenArg === undefined || blueArg === undefined) {
    return null;
  }

  const red = parseRgbChannel(redArg);
  const green = parseRgbChannel(greenArg);
  const blue = parseRgbChannel(blueArg);
  if (!red || !green || !blue) {
    return null;
  }

  const alphaArg = args[3];
  const alpha = fnName === 'rgba' ? (alphaArg !== undefined ? parseAlphaChannel(alphaArg) : null) : { value: 1, isPercent: false };
  if (!alpha) {
    return null;
  }

  return {
    rgba: {
      r: red.value,
      g: green.value,
      b: blue.value,
      a: alpha.value
    },
    shell: {
      kind: 'rgb',
      fnName,
      channelIsPercent: [red.isPercent, green.isPercent, blue.isPercent],
      alphaIsPercent: alpha.isPercent
    }
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const second = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = second;
  } else if (huePrime < 2) {
    red = second;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = second;
  } else if (huePrime < 4) {
    green = second;
    blue = chroma;
  } else if (huePrime < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }

  const offset = lightness - chroma / 2;
  return {
    r: clamp((red + offset) * 255, 0, 255),
    g: clamp((green + offset) * 255, 0, 255),
    b: clamp((blue + offset) * 255, 0, 255)
  };
}

function rgbToHsl(color: RgbaColor): { h: number; s: number; l: number } {
  const red = clamp(color.r, 0, 255) / 255;
  const green = clamp(color.g, 0, 255) / 255;
  const blue = clamp(color.b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: (hue + 360) % 360,
    s: clamp(saturation, 0, 1),
    l: clamp(lightness, 0, 1)
  };
}

function parseHslColor(text: string): ParsedColorToken | null {
  const matched = text.match(/^(hsla?)\((.*)\)$/i);
  if (!matched) {
    return null;
  }

  const fnToken = matched[1];
  const argsToken = matched[2];
  if (!fnToken || argsToken === undefined) {
    return null;
  }

  const fnName = fnToken.toLowerCase() as 'hsl' | 'hsla';
  const args = argsToken.split(',').map((arg) => arg.trim());
  const expectedLength = fnName === 'hsla' ? 4 : 3;
  if (args.length !== expectedLength) {
    return null;
  }

  const hueArg = args[0];
  const saturationToken = args[1];
  const lightnessToken = args[2];
  if (hueArg === undefined || saturationToken === undefined || lightnessToken === undefined) {
    return null;
  }

  const hue = Number.parseFloat(hueArg);

  if (Number.isNaN(hue) || !saturationToken.endsWith('%') || !lightnessToken.endsWith('%')) {
    return null;
  }

  const saturation = Number.parseFloat(saturationToken.slice(0, -1));
  const lightness = Number.parseFloat(lightnessToken.slice(0, -1));
  if (Number.isNaN(saturation) || Number.isNaN(lightness)) {
    return null;
  }

  const alphaArg = args[3];
  const alpha = fnName === 'hsla' ? (alphaArg !== undefined ? parseAlphaChannel(alphaArg) : null) : { value: 1, isPercent: false };
  if (!alpha) {
    return null;
  }

  const rgb = hslToRgb(hue, saturation / 100, lightness / 100);

  return {
    rgba: {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: alpha.value
    },
    shell: {
      kind: 'hsl',
      fnName,
      alphaIsPercent: alpha.isPercent
    }
  };
}

function parseColorText(text: string): ParsedColorToken | null {
  const normalized = text.trim();
  return parseHexColor(normalized) ?? parseRgbColor(normalized) ?? parseHslColor(normalized);
}

function serializeAlpha(alpha: number, asPercent: boolean): string {
  const clampedAlpha = clamp(alpha, 0, 1);
  if (asPercent) {
    return `${Math.round(clampedAlpha * 100)}%`;
  }
  return `${roundTo(clampedAlpha, 3)}`.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function serializeColor(color: RgbaColor, shell: ColorShell): string {
  if (shell.kind === 'hex') {
    const red = toByteHex(color.r);
    const green = toByteHex(color.g);
    const blue = toByteHex(color.b);
    const alpha = toByteHex(color.a * 255);

    let payload = '';
    if (shell.digits === 3) {
      payload = `${toNibbleHex(color.r)}${toNibbleHex(color.g)}${toNibbleHex(color.b)}`;
    } else if (shell.digits === 4) {
      payload = `${toNibbleHex(color.r)}${toNibbleHex(color.g)}${toNibbleHex(color.b)}${toNibbleHex(color.a * 255)}`;
    } else if (shell.digits === 6) {
      payload = `${red}${green}${blue}`;
    } else {
      payload = `${red}${green}${blue}${alpha}`;
    }

    const token = `#${payload}`;
    return shell.uppercase ? token.toUpperCase() : token.toLowerCase();
  }

  if (shell.kind === 'rgb') {
    const [redPercent, greenPercent, bluePercent] = shell.channelIsPercent;
    const red = redPercent ? `${Math.round((color.r / 255) * 100)}%` : `${Math.round(color.r)}`;
    const green = greenPercent ? `${Math.round((color.g / 255) * 100)}%` : `${Math.round(color.g)}`;
    const blue = bluePercent ? `${Math.round((color.b / 255) * 100)}%` : `${Math.round(color.b)}`;

    if (shell.fnName === 'rgba') {
      const alpha = serializeAlpha(color.a, shell.alphaIsPercent);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    return `rgb(${red}, ${green}, ${blue})`;
  }

  const hsl = rgbToHsl(color);
  const hue = Math.round(hsl.h);
  const saturation = `${Math.round(hsl.s * 100)}%`;
  const lightness = `${Math.round(hsl.l * 100)}%`;

  if (shell.fnName === 'hsla') {
    const alpha = serializeAlpha(color.a, shell.alphaIsPercent);
    return `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`;
  }

  return `hsl(${hue}, ${saturation}, ${lightness})`;
}

function rgbaToHsva(color: RgbaColor): HsvaColor {
  const red = clamp(color.r, 0, 255) / 255;
  const green = clamp(color.g, 0, 255) / 255;
  const blue = clamp(color.b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    h: (hue + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: clamp(color.a, 0, 1)
  };
}

function hsvaToRgba(color: HsvaColor): RgbaColor {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s, 0, 1);
  const value = clamp(color.v, 0, 1);
  const chroma = value * saturation;
  const huePrime = hue / 60;
  const second = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const offset = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = second;
  } else if (huePrime < 2) {
    red = second;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = second;
  } else if (huePrime < 4) {
    green = second;
    blue = chroma;
  } else if (huePrime < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }

  return {
    r: clamp((red + offset) * 255, 0, 255),
    g: clamp((green + offset) * 255, 0, 255),
    b: clamp((blue + offset) * 255, 0, 255),
    a: clamp(color.a, 0, 1)
  };
}

function resolveCurrentColorRange(state: EditorView['state'], anchorFrom: number): {
  from: number;
  to: number;
  colorText: string;
  parsed: ParsedColorToken;
} | null {
  const safeAnchor = Math.min(Math.max(anchorFrom, 0), state.doc.length);
  const line = state.doc.lineAt(safeAnchor);
  COLOR_TOKEN_PATTERN.lastIndex = 0;

  let nearestMatch:
    | {
        from: number;
        to: number;
        colorText: string;
        parsed: ParsedColorToken;
        distance: number;
      }
    | null = null;

  let matched = COLOR_TOKEN_PATTERN.exec(line.text);
  while (matched) {
    const colorText = matched[0];
    const parsed = parseColorText(colorText);
    if (!parsed) {
      matched = COLOR_TOKEN_PATTERN.exec(line.text);
      continue;
    }

    const from = line.from + matched.index;
    const to = from + colorText.length;

    if (safeAnchor >= from && safeAnchor <= to) {
      return { from, to, colorText, parsed };
    }

    const distance = Math.abs(safeAnchor - from);
    if (!nearestMatch || distance < nearestMatch.distance) {
      nearestMatch = { from, to, colorText, parsed, distance };
    }

    matched = COLOR_TOKEN_PATTERN.exec(line.text);
  }

  if (!nearestMatch) {
    return null;
  }

  return {
    from: nearestMatch.from,
    to: nearestMatch.to,
    colorText: nearestMatch.colorText,
    parsed: nearestMatch.parsed
  };
}

function resolveContainingSugarStartLine(state: EditorView['state'], anchorFrom: number): number | null {
  const targetLineNumber = state.doc.lineAt(anchorFrom).number;
  const stack: number[] = [];

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const isOpen = SUGAR_OPEN_PATTERN.test(line.text);
    const isClose = SUGAR_CLOSE_PATTERN.test(line.text);

    if (isOpen) {
      stack.push(lineNumber);
    }

    if (lineNumber === targetLineNumber) {
      if (isOpen) {
        return lineNumber;
      }
      if (isClose && stack.length > 0) {
        return stack[stack.length - 1] ?? null;
      }
      return stack.length > 0 ? (stack[stack.length - 1] ?? null) : null;
    }

    if (isClose && stack.length > 0) {
      stack.pop();
    }
  }

  return null;
}

class ColorPickerPanelController {
  private readonly view: EditorView;
  private readonly root: HTMLDivElement;
  private readonly preview: HTMLDivElement;
  private readonly satArea: HTMLDivElement;
  private readonly satCursor: HTMLDivElement;
  private readonly hueInput: HTMLInputElement;
  private readonly alphaInput: HTMLInputElement;
  private readonly textInput: HTMLInputElement;
  private activeContext: {
    anchorFrom: number;
    shell: ColorShell;
    swatch: HTMLButtonElement;
  } | null = null;
  private hsva: HsvaColor = { h: 0, s: 0, v: 0, a: 1 };
  private writebackTimer: number | null = null;
  private hoverOpenTimer: number | null = null;
  private hoverCloseTimer: number | null = null;
  private pendingHoverTarget: { anchorFrom: number; swatch: HTMLButtonElement } | null = null;
  private queuedToken: string | null = null;
  private lastWritebackAt = 0;
  private isOpen = false;

  constructor(view: EditorView) {
    this.view = view;

    this.root = document.createElement('div');
    this.root.className = 'cm-color-picker-panel';
    this.root.setAttribute('role', 'dialog');
    this.root.classList.add('cm-color-picker-panel-hidden');

    this.preview = document.createElement('div');
    this.preview.className = 'cm-color-panel-preview';

    this.satArea = document.createElement('div');
    this.satArea.className = 'cm-color-panel-sat';
    this.satCursor = document.createElement('div');
    this.satCursor.className = 'cm-color-panel-cursor';
    this.satArea.append(this.satCursor);

    this.hueInput = document.createElement('input');
    this.hueInput.className = 'cm-color-panel-range cm-color-panel-hue';
    this.hueInput.type = 'range';
    this.hueInput.min = '0';
    this.hueInput.max = '360';
    this.hueInput.step = '1';

    this.alphaInput = document.createElement('input');
    this.alphaInput.className = 'cm-color-panel-range cm-color-panel-alpha';
    this.alphaInput.type = 'range';
    this.alphaInput.min = '0';
    this.alphaInput.max = '100';
    this.alphaInput.step = '1';

    this.textInput = document.createElement('input');
    this.textInput.className = 'cm-color-panel-text';
    this.textInput.type = 'text';
    this.textInput.spellcheck = false;

    this.root.append(this.preview, this.satArea, this.hueInput, this.alphaInput, this.textInput);
    this.view.dom.append(this.root);

    this.bindEvents();
  }

  destroy(): void {
    this.close();
    this.clearHoverOpenTimer();
    this.clearHoverCloseTimer();
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
      this.writebackTimer = null;
    }
    this.root.remove();
  }

  open(anchorFrom: number, swatch: HTMLButtonElement): void {
    this.clearHoverOpenTimer();
    this.clearHoverCloseTimer();
    this.pendingHoverTarget = null;

    const range = resolveCurrentColorRange(this.view.state, anchorFrom);
    if (!range) {
      return;
    }

    this.activeContext = {
      anchorFrom: range.from,
      shell: range.parsed.shell,
      swatch
    };

    this.hsva = rgbaToHsva(range.parsed.rgba);
    if (!this.supportsAlpha()) {
      this.hsva.a = 1;
    }

    this.setSugarHoverLock(range.from);

    this.root.classList.remove('cm-color-picker-panel-hidden');
    this.root.classList.add('cm-color-picker-panel-open');
    this.isOpen = true;
    this.refreshPanel(true);
    this.positionPanel();
  }

  hoverOpen(anchorFrom: number, swatch: HTMLButtonElement): void {
    this.clearHoverCloseTimer();

    if (this.isOpen && this.activeContext?.swatch === swatch) {
      return;
    }

    this.clearHoverOpenTimer();
    this.pendingHoverTarget = { anchorFrom, swatch };
    this.hoverOpenTimer = window.setTimeout(() => {
      this.hoverOpenTimer = null;
      const target = this.pendingHoverTarget;
      this.pendingHoverTarget = null;
      if (!target || !target.swatch.isConnected) {
        return;
      }
      this.open(target.anchorFrom, target.swatch);
    }, COLOR_HOVER_OPEN_DELAY_MS);
  }

  hoverLeaveSwatch(swatch: HTMLButtonElement): void {
    if (this.pendingHoverTarget?.swatch === swatch) {
      this.clearHoverOpenTimer();
      this.pendingHoverTarget = null;
    }

    if (this.isOpen && this.activeContext?.swatch === swatch) {
      this.scheduleHoverClose();
    }
  }

  hoverEnterPanel(): void {
    this.clearHoverCloseTimer();
  }

  hoverLeavePanel(): void {
    if (!this.isOpen) {
      return;
    }
    this.scheduleHoverClose();
  }

  syncToDocument(): void {
    if (!this.activeContext) {
      return;
    }
    const range = resolveCurrentColorRange(this.view.state, this.activeContext.anchorFrom);
    if (!range) {
      this.close();
      return;
    }
    this.activeContext.anchorFrom = range.from;
  }

  private supportsAlpha(): boolean {
    if (!this.activeContext) {
      return false;
    }
    const { shell } = this.activeContext;
    if (shell.kind === 'hex') {
      return shell.digits === 4 || shell.digits === 8;
    }
    return shell.kind === 'rgb' ? shell.fnName === 'rgba' : shell.fnName === 'hsla';
  }

  private refreshPanel(updateTextInput: boolean): void {
    const rgba = hsvaToRgba(this.hsva);
    const hex = `#${toByteHex(rgba.r)}${toByteHex(rgba.g)}${toByteHex(rgba.b)}`;
    this.preview.style.background = `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${roundTo(rgba.a, 3)})`;
    this.satArea.style.backgroundColor = `hsl(${Math.round(this.hsva.h)}, 100%, 50%)`;
    this.hueInput.value = `${Math.round(this.hsva.h)}`;
    this.alphaInput.value = `${Math.round(this.hsva.a * 100)}`;
    this.alphaInput.disabled = !this.supportsAlpha();
    const alphaTrack = `linear-gradient(90deg, transparent, ${hex})`;
    this.alphaInput.style.setProperty('--cm-color-alpha-track', alphaTrack);
    this.alphaInput.style.background = alphaTrack;
    this.satCursor.style.left = `${this.hsva.s * 100}%`;
    this.satCursor.style.top = `${(1 - this.hsva.v) * 100}%`;

    if (updateTextInput && this.activeContext) {
      this.textInput.value = serializeColor(rgba, this.activeContext.shell);
    }
  }

  private scheduleWriteback(nextToken: string): void {
    const now = performance.now();
    const elapsed = now - this.lastWritebackAt;

    if (this.writebackTimer === null && elapsed >= COLOR_INPUT_WRITEBACK_INTERVAL_MS) {
      this.dispatchColor(nextToken);
      this.lastWritebackAt = performance.now();
      return;
    }

    this.queuedToken = nextToken;
    if (this.writebackTimer !== null) {
      return;
    }

    const wait = Math.max(COLOR_INPUT_WRITEBACK_INTERVAL_MS - elapsed, 0);
    this.writebackTimer = window.setTimeout(() => {
      this.writebackTimer = null;
      const queued = this.queuedToken;
      this.queuedToken = null;
      if (!queued) {
        return;
      }
      this.dispatchColor(queued);
      this.lastWritebackAt = performance.now();
    }, wait);
  }

  private flushWriteback(nextToken: string): void {
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
      this.writebackTimer = null;
    }
    this.queuedToken = null;
    this.dispatchColor(nextToken);
    this.lastWritebackAt = performance.now();
  }

  private dispatchColor(nextToken: string): void {
    if (!this.activeContext) {
      return;
    }
    const range = resolveCurrentColorRange(this.view.state, this.activeContext.anchorFrom);
    if (!range) {
      this.close();
      return;
    }
    this.activeContext.anchorFrom = range.from;
    this.activeContext.swatch.style.backgroundColor = nextToken;
    this.view.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: nextToken
      }
    });
  }

  private applyCurrentColor(immediate: boolean): void {
    if (!this.activeContext) {
      return;
    }
    const rgba = hsvaToRgba(this.hsva);
    const token = serializeColor(rgba, this.activeContext.shell);
    this.textInput.value = token;
    if (immediate) {
      this.flushWriteback(token);
      return;
    }
    this.scheduleWriteback(token);
  }

  private updateSatByPointer(clientX: number, clientY: number): void {
    const rect = this.satArea.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const nextS = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextV = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    this.hsva = { ...this.hsva, s: nextS, v: nextV };
    this.refreshPanel(false);
    this.applyCurrentColor(false);
  }

  private positionPanel(): void {
    if (!this.activeContext) {
      return;
    }
    const swatchRect = this.activeContext.swatch.getBoundingClientRect();
    const editorRect = this.view.dom.getBoundingClientRect();
    const top = swatchRect.bottom - editorRect.top + 8;
    const left = swatchRect.left - editorRect.left;
    this.root.style.left = `${Math.max(left, 8)}px`;
    this.root.style.top = `${Math.max(top, 8)}px`;
  }

  private close(): void {
    if (!this.isOpen) {
      return;
    }
    this.clearHoverCloseTimer();
    this.clearHoverOpenTimer();
    this.pendingHoverTarget = null;
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
      this.writebackTimer = null;
    }
    this.queuedToken = null;
    this.root.classList.remove('cm-color-picker-panel-open');
    this.root.classList.add('cm-color-picker-panel-hidden');
    this.clearSugarHoverLock();
    this.isOpen = false;
    this.activeContext = null;
  }

  private setSugarHoverLock(anchorFrom: number): void {
    const lineNumber = resolveContainingSugarStartLine(this.view.state, anchorFrom)
      ?? this.view.state.doc.lineAt(anchorFrom).number;
    setLockedSugarLine(this.view, lineNumber);
    this.view.dispatch({
      effects: setSugarHoveredLineEffect.of(lineNumber)
    });
  }

  private clearSugarHoverLock(): void {
    clearLockedSugarLine(this.view);
    this.view.dispatch({
      effects: setSugarHoveredLineEffect.of(null)
    });
  }

  private clearHoverOpenTimer(): void {
    if (this.hoverOpenTimer !== null) {
      clearTimeout(this.hoverOpenTimer);
      this.hoverOpenTimer = null;
    }
  }

  private clearHoverCloseTimer(): void {
    if (this.hoverCloseTimer !== null) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
  }

  private scheduleHoverClose(): void {
    this.clearHoverCloseTimer();
    this.hoverCloseTimer = window.setTimeout(() => {
      this.hoverCloseTimer = null;
      this.close();
    }, COLOR_HOVER_CLOSE_DELAY_MS);
  }

  private bindEvents(): void {
    let isDraggingSat = false;

    this.root.addEventListener('mouseenter', () => {
      this.hoverEnterPanel();
    });

    this.root.addEventListener('mouseleave', () => {
      this.hoverLeavePanel();
    });

    this.satArea.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      event.preventDefault();
      isDraggingSat = true;
      this.updateSatByPointer(event.clientX, event.clientY);
    });

    document.addEventListener('pointermove', (event) => {
      if (!isDraggingSat || !this.isOpen) {
        return;
      }
      this.updateSatByPointer(event.clientX, event.clientY);
    });

    document.addEventListener('pointerup', () => {
      if (!isDraggingSat || !this.isOpen) {
        isDraggingSat = false;
        return;
      }
      isDraggingSat = false;
      this.applyCurrentColor(true);
    });

    this.hueInput.addEventListener('input', () => {
      const nextHue = Number.parseFloat(this.hueInput.value);
      if (Number.isNaN(nextHue)) {
        return;
      }
      this.hsva = { ...this.hsva, h: clamp(nextHue, 0, 360) };
      this.refreshPanel(false);
      this.applyCurrentColor(false);
    });

    this.hueInput.addEventListener('change', () => {
      this.applyCurrentColor(true);
    });

    this.alphaInput.addEventListener('input', () => {
      if (!this.supportsAlpha()) {
        return;
      }
      const nextAlpha = Number.parseFloat(this.alphaInput.value);
      if (Number.isNaN(nextAlpha)) {
        return;
      }
      this.hsva = { ...this.hsva, a: clamp(nextAlpha / 100, 0, 1) };
      this.refreshPanel(false);
      this.applyCurrentColor(false);
    });

    this.alphaInput.addEventListener('change', () => {
      this.applyCurrentColor(true);
    });

    this.textInput.addEventListener('change', () => {
      const parsed = parseColorText(this.textInput.value);
      if (!parsed || !this.activeContext) {
        this.refreshPanel(true);
        return;
      }
      this.activeContext.shell = parsed.shell;
      this.hsva = rgbaToHsva(parsed.rgba);
      if (!this.supportsAlpha()) {
        this.hsva = { ...this.hsva, a: 1 };
      }
      this.refreshPanel(true);
      this.applyCurrentColor(true);
    });

    document.addEventListener(
      'mousedown',
      (event) => {
        if (!this.isOpen || !this.activeContext) {
          return;
        }
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }
        if (this.root.contains(target) || this.activeContext.swatch.contains(target)) {
          return;
        }
        this.close();
      },
      true
    );

    this.view.scrollDOM.addEventListener('scroll', () => {
      if (!this.isOpen) {
        return;
      }
      this.positionPanel();
    });

    window.addEventListener('resize', () => {
      if (!this.isOpen) {
        return;
      }
      this.positionPanel();
    });
  }
}

class ColorPreviewWidget extends WidgetType {
  private readonly from: number;
  private readonly initialColor: string;
  private readonly panelController: ColorPickerPanelController;

  constructor(panelController: ColorPickerPanelController, from: number, colorText: string) {
    super();
    this.panelController = panelController;
    this.from = from;
    this.initialColor = colorText;
  }

  eq(other: ColorPreviewWidget): boolean {
    return this.from === other.from && this.initialColor.toLowerCase() === other.initialColor.toLowerCase();
  }

  ignoreEvent(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span');
    container.className = 'cm-color-preview';

    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'cm-color-swatch';
    swatch.setAttribute('aria-label', '打开颜色选择器');
    swatch.style.backgroundColor = this.initialColor;

    swatch.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.panelController.open(this.from, swatch);
    });

    swatch.addEventListener('mouseenter', () => {
      this.panelController.hoverOpen(this.from, swatch);
    });

    swatch.addEventListener('mouseleave', () => {
      this.panelController.hoverLeaveSwatch(swatch);
    });

    container.append(swatch);
    return container;
  }
}

function buildColorPreviewDecorations(state: EditorView['state'], panelController: ColorPickerPanelController): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let sugarDepth = 0;

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const isOpen = SUGAR_OPEN_PATTERN.test(line.text);
    const isClose = SUGAR_CLOSE_PATTERN.test(line.text) && sugarDepth > 0;
    const isInSugar = isOpen || sugarDepth > 0 || isClose;

    if (isInSugar) {
      COLOR_TOKEN_PATTERN.lastIndex = 0;
      let matched = COLOR_TOKEN_PATTERN.exec(line.text);

      while (matched) {
        const colorText = matched[0];
        if (parseColorText(colorText)) {
          const from = line.from + matched.index;

          builder.add(
            from,
            from,
            Decoration.widget({
              side: -1,
              widget: new ColorPreviewWidget(panelController, from, colorText)
            })
          );
        }

        matched = COLOR_TOKEN_PATTERN.exec(line.text);
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
  private readonly panelController: ColorPickerPanelController;

  constructor(view: EditorView) {
    this.panelController = new ColorPickerPanelController(view);
    this.decorations = buildColorPreviewDecorations(view.state, this.panelController);
  }

  update(update: ViewUpdate): void {
    if (!update.docChanged && !update.viewportChanged) {
      return;
    }

    if (update.docChanged) {
      this.decorations = this.decorations.map(update.changes);
      this.panelController.syncToDocument();
    }

    if (update.viewportChanged || update.docChanged) {
      this.decorations = buildColorPreviewDecorations(update.view.state, this.panelController);
    }
  }

  destroy(): void {
    this.panelController.destroy();
  }
}

const colorPreviewPlugin = ViewPlugin.fromClass(ColorPreviewViewPlugin, {
  decorations: (plugin) => plugin.decorations
});

export function createColorPreviewExtension(): Extension {
  return [colorPreviewPlugin];
}
