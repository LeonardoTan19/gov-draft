import { EditorState, type Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { indentUnit } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import { createSugarFoldExtension } from './extensions/sugarFoldExtension';
import { createHeadingRainbowFoldExtension } from './extensions/headingRainbowFoldExtension';
import { createColorPreviewExtension } from './extensions/colorPreviewExtension';
import { editorTheme } from './theme';

interface CreateEditorStateOptions {
  content: string;
  onChange: (value: string) => void;
}

export function createEditorState(options: CreateEditorStateOptions): EditorState {
  const extensions: Extension[] = [
    history(),
    keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
    indentUnit.of('    '),
    EditorView.lineWrapping,
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
      'aria-label': '公文 Markdown 编辑器'
    })
  ];

  return EditorState.create({
    doc: options.content,
    extensions
  });
}
