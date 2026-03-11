/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createColorPreviewExtension } from '../colorPreviewExtension';

function createView(doc: string): { view: EditorView; parent: HTMLDivElement } {
  const parent = document.createElement('div');
  document.body.appendChild(parent);

  const state = EditorState.create({
    doc,
    extensions: [createColorPreviewExtension()]
  });

  const view = new EditorView({ state, parent });
  return { view, parent };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('createColorPreviewExtension', () => {
  it('仅在语法糖块内渲染颜色预览色块', () => {
    const doc = ['outside #00ff00', '::: block', "inside '#0000ff'", ':::', 'after #112233'].join('\n');
    const { view, parent } = createView(doc);

    const swatches = view.dom.querySelectorAll('.cm-color-swatch');
    expect(swatches).toHaveLength(1);

    view.destroy();
    parent.remove();
  });

  it('点击色块后打开自定义取色面板', () => {
    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    const panel = view.dom.querySelector('.cm-color-picker-panel');
    if (!(panel instanceof HTMLDivElement)) {
      throw new Error('未找到面板');
    }

    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(false);
    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(true);

    view.destroy();
    parent.remove();
  });

  it('悬停延时打开并在移开后延时关闭', () => {
    vi.useFakeTimers();

    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    const panel = view.dom.querySelector('.cm-color-picker-panel');
    if (!(panel instanceof HTMLDivElement)) {
      throw new Error('未找到面板');
    }

    swatch.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(179);
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(true);

    swatch.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    vi.advanceTimersByTime(249);
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(false);

    view.destroy();
    parent.remove();
  });

  it('点击面板外部会关闭取色面板', () => {
    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    const panel = view.dom.querySelector('.cm-color-picker-panel');
    if (!(panel instanceof HTMLDivElement)) {
      throw new Error('未找到面板');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(true);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(panel.classList.contains('cm-color-picker-panel-open')).toBe(false);

    view.destroy();
    parent.remove();
  });

  it('拖动色相滑杆时按 20ms 节流写回', () => {
    vi.useFakeTimers();

    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const hueInput = view.dom.querySelector('.cm-color-panel-hue');
    if (!(hueInput instanceof HTMLInputElement)) {
      throw new Error('未找到色相滑杆');
    }

    hueInput.value = '120';
    hueInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(view.state.doc.toString()).toContain("'#0000ff'");

    vi.advanceTimersByTime(19);
    expect(view.state.doc.toString()).toContain("'#0000ff'");

    vi.advanceTimersByTime(1);
    expect(view.state.doc.toString()).not.toContain("'#0000ff'");

    view.destroy();
    parent.remove();
  });

  it('保留 rgba 格式壳写回', () => {
    const doc = ['::: block', 'inside rgba(0, 0, 255, 0.5)', ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const hueInput = view.dom.querySelector('.cm-color-panel-hue');
    if (!(hueInput instanceof HTMLInputElement)) {
      throw new Error('未找到色相滑杆');
    }

    hueInput.value = '0';
    hueInput.dispatchEvent(new Event('change', { bubbles: true }));

    const docText = view.state.doc.toString();
    expect(docText).toContain('rgba(');
    expect(docText).not.toContain('#');

    view.destroy();
    parent.remove();
  });

  it('保留 hsl 格式壳写回', () => {
    const doc = ['::: block', 'inside hsl(240, 100%, 50%)', ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const hueInput = view.dom.querySelector('.cm-color-panel-hue');
    if (!(hueInput instanceof HTMLInputElement)) {
      throw new Error('未找到色相滑杆');
    }

    hueInput.value = '120';
    hueInput.dispatchEvent(new Event('change', { bubbles: true }));

    const docText = view.state.doc.toString();
    expect(docText).toContain('hsl(');
    expect(docText).not.toContain('rgb(');

    view.destroy();
    parent.remove();
  });

  it('支持透明度 Hex 并保留 alpha 位数', () => {
    const doc = ['::: block', "inside '#11223344'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const textInput = view.dom.querySelector('.cm-color-panel-text');
    if (!(textInput instanceof HTMLInputElement)) {
      throw new Error('未找到颜色文本输入框');
    }

    textInput.value = '#aabbccdd';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(view.state.doc.toString()).toContain("'#aabbccdd'");

    view.destroy();
    parent.remove();
  });
});
