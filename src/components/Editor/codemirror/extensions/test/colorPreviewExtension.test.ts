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

  it('悬停 50ms 后打开选色器', () => {
    vi.useFakeTimers();

    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const showPickerSpy = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPickerSpy
    });

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(49);
    expect(showPickerSpy).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1);
    expect(showPickerSpy).toHaveBeenCalledTimes(1);

    view.destroy();
    parent.remove();
  });

  it('点击色块并修改颜色后会更新文档文本', () => {
    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const showPickerSpy = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPickerSpy
    });

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(showPickerSpy).toHaveBeenCalledTimes(1);

    const input = view.dom.querySelector('.cm-color-picker-input');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('未找到颜色选择 input');
    }

    input.value = '#112233';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(view.state.doc.toString()).toContain("'#112233'");

    view.destroy();
    parent.remove();
  });

  it('拖动选色时按 20ms 节流写回', () => {
    vi.useFakeTimers();

    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const input = view.dom.querySelector('.cm-color-picker-input');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('未找到颜色选择 input');
    }

    input.value = '#123456';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(view.state.doc.toString()).toContain("'#0000ff'");

    vi.advanceTimersByTime(19);
    expect(view.state.doc.toString()).toContain("'#0000ff'");

    vi.advanceTimersByTime(1);
    expect(view.state.doc.toString()).toContain("'#123456'");

    view.destroy();
    parent.remove();
  });

  it('支持透明度 Hex 并在更新时保留 alpha', () => {
    const doc = ['::: block', "inside '#11223344'", ':::'].join('\n');
    const { view, parent } = createView(doc);

    const input = view.dom.querySelector('.cm-color-picker-input');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('未找到颜色选择 input');
    }

    expect(input.value).toBe('#112233');

    input.value = '#aabbcc';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(view.state.doc.toString()).toContain("'#aabbcc44'");

    view.destroy();
    parent.remove();
  });
});
