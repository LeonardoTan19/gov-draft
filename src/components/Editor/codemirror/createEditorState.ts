import { EditorState, type Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { indentUnit } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { EditorView, ViewPlugin, type ViewUpdate, keymap, lineNumbers } from '@codemirror/view';
import { createSugarFoldExtension } from './extensions/sugarFoldExtension';
import { createHeadingRainbowFoldExtension } from './extensions/headingRainbowFoldExtension';
import { createColorPreviewExtension } from './extensions/colorPreviewExtension';
import { editorTheme } from './theme';
import { i18n } from '../../../locales';

interface CreateEditorStateOptions {
  content: string;
  onChange: (value: string) => void;
}

const MIN_LINE_NUMBER_DIGITS = 2;

function syncLineNumberDigits(view: EditorView): void {
  const lineCount = view.state.doc.lines;
  const digits = Math.max(MIN_LINE_NUMBER_DIGITS, String(lineCount).length);
  view.dom.style.setProperty('--cm-line-number-digits', String(digits));
}

const lineNumberDigitsPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      syncLineNumberDigits(view);
    }

    update(update: ViewUpdate): void {
      if (!update.docChanged) {
        return;
      }
      syncLineNumberDigits(update.view);
    }
  }
);

export function createEditorState(options: CreateEditorStateOptions): EditorState {
  const t = i18n.global.t;
  const extensions: Extension[] = [
    history(),
    keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
    indentUnit.of('    '),
    EditorView.lineWrapping,
    lineNumbers(),
    lineNumberDigitsPlugin,
    markdown(),
    editorTheme,
    createColorPreviewExtension(),
    createSugarFoldExtension(),
    createHeadingRainbowFoldExtension(),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) {
        return;
      }
      options.onChange(update.state.doc.toString());
    }),
    EditorState.tabSize.of(4),
    EditorView.contentAttributes.of({
      'aria-label': t('codemirror.editorAria')
    })
  ];

  return EditorState.create({
    doc: options.content,
    extensions
  });
}
