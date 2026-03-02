import { EditorView } from '@codemirror/view';

export const COLOR_PICKER_ACTIVE_CLASS = 'cm-color-picker-active';
export const COLOR_PICKER_LOCK_LINE_ATTR = 'data-color-picker-lock-line';

export function getLockedSugarLine(view: EditorView): number | null {
  if (!view.dom.classList.contains(COLOR_PICKER_ACTIVE_CLASS)) {
    return null;
  }

  const rawLine = view.dom.getAttribute(COLOR_PICKER_LOCK_LINE_ATTR);
  if (!rawLine) {
    return null;
  }

  const lineNumber = Number.parseInt(rawLine, 10);
  return Number.isNaN(lineNumber) ? null : lineNumber;
}

export function setLockedSugarLine(view: EditorView, lineNumber: number): void {
  view.dom.classList.add(COLOR_PICKER_ACTIVE_CLASS);
  view.dom.setAttribute(COLOR_PICKER_LOCK_LINE_ATTR, `${lineNumber}`);
}

export function clearLockedSugarLine(view: EditorView): void {
  view.dom.classList.remove(COLOR_PICKER_ACTIVE_CLASS);
  view.dom.removeAttribute(COLOR_PICKER_LOCK_LINE_ATTR);
}
