/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createSugarFoldExtension } from '../sugarFoldExtension';
import { createColorPreviewExtension } from '../colorPreviewExtension';

function findLineElementByText(view: EditorView, lineText: string): HTMLElement {
  const lines = Array.from(view.dom.querySelectorAll<HTMLElement>('.cm-line'));
  const matched = lines.find((lineElement) => lineElement.textContent?.trim() === lineText);

  if (!matched) {
    throw new Error(`未找到行: ${lineText}`);
  }

  return matched;
}

function findSugarBoundaryLine(view: EditorView): HTMLElement {
  const lines = Array.from(view.dom.querySelectorAll<HTMLElement>('.cm-line'));
  const matched = lines.find((lineElement) => lineElement.textContent?.includes(':::'));

  if (!matched) {
    throw new Error('未找到语法糖边界行');
  }

  return matched;
}

describe('createSugarFoldExtension', () => {
  it('显示子级标签时自动展开父级标签', async () => {
    const doc = ['::: parent', 'parent body', '::: child', 'child body', ':::', ':::'].join('\n');
    const state = EditorState.create({
      doc,
      extensions: [createSugarFoldExtension()]
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const view = new EditorView({
      state,
      parent
    });

    const childOpenLine = view.state.doc.line(3);
    view.dispatch({
      selection: { anchor: childOpenLine.from }
    });

    await Promise.resolve();

    const parentOpenLineElement = findLineElementByText(view, '::: parent');
    const childOpenLineElement = findLineElementByText(view, '::: child');

    expect(parentOpenLineElement.classList.contains('cm-sugar-line-expanded')).toBe(true);
    expect(childOpenLineElement.classList.contains('cm-sugar-line-expanded')).toBe(true);

    view.destroy();
    parent.remove();
  });

  it('取色板可见时 mouseleave 不折叠所处语法糖', async () => {
    const doc = ['::: block', "inside '#0000ff'", ':::'].join('\n');
    const state = EditorState.create({
      doc,
      extensions: [createColorPreviewExtension(), createSugarFoldExtension()]
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const view = new EditorView({
      state,
      parent
    });

    const swatch = view.dom.querySelector('.cm-color-swatch');
    if (!(swatch instanceof HTMLElement)) {
      throw new Error('未找到颜色色块');
    }

    swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    view.dom.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await Promise.resolve();

    const openLineElement = findSugarBoundaryLine(view);
    expect(openLineElement.classList.contains('cm-sugar-line-expanded')).toBe(true);

    view.destroy();
    parent.remove();
  });
});
