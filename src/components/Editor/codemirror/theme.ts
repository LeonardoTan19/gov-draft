import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
  '&': {
    flex: '1',
    width: '100%',
    fontSize: '14px',
    overflow: 'auto'
  },
  '.cm-editor': {
    height: '100%'
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    lineHeight: '1.75',
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '14px',
    caretColor: '#0f172a'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#0f172a'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#d7e4f2'
  },
  '.cm-gutters': {
    border: '0',
    background: '#ffffff'
  },
  '.cm-heading-fold-gutter': {
    width: '24px'
  },
  '.cm-heading-fold-button': {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    border: '0',
    background: 'transparent',
    color: '#475569',
    fontSize: '12px',
    lineHeight: '16px',
    padding: '0'
  },
  '.cm-heading-rainbow': {
    borderLeft: '3px solid transparent',
    paddingLeft: '2px'
  },
  '.cm-heading-level-1': {
    background: '#e06c751a',
    borderLeftColor: '#e06c75'
  },
  '.cm-heading-level-2': {
    background: '#e5c07b1a',
    borderLeftColor: '#e5c07b'
  },
  '.cm-heading-level-3': {
    background: '#98c3791a',
    borderLeftColor: '#98c379'
  },
  '.cm-heading-level-4': {
    background: '#56b6c21a',
    borderLeftColor: '#56b6c2'
  },
  '.cm-heading-level-5': {
    background: '#61afef1a',
    borderLeftColor: '#61afef'
  },
  '.cm-heading-level-6': {
    background: '#c678dd1a',
    borderLeftColor: '#c678dd'
  },
  '.cm-sugar-token': {
    fontWeight: '700',
    textDecoration: 'underline 2px',
    transition: 'transform 140ms ease-out, opacity 120ms ease-out'
  },
  '.cm-sugar-line-collapsed': {
    fontSize: '12px',
    transition: 'transform 140ms ease-out, opacity 120ms ease-out'
  },
  '.cm-sugar-line-expanded': {
    transform: 'translateX(8px)',
    transition: 'transform 140ms ease-out'
  },
  '.cm-sugar-token-collapsed': {
    opacity: '0.92'
  },
  '.cm-sugar-token-expanded': {
    transform: 'translateX(8px)',
    opacity: '1'
  },
  '.cm-sugar-collapsed-text': {
    color: 'inherit',
    opacity: '0.85',
    fontStyle: 'italic'
  },
  '.cm-heading-inline-fold': {
    marginLeft: '8px',
    padding: '0 8px',
    height: '18px',
    borderRadius: '999px',
    border: '1px solid transparent',
    fontSize: '11px',
    lineHeight: '16px',
    cursor: 'pointer',
    verticalAlign: 'middle'
  },
  '.cm-heading-inline-fold-level-1': {
    color: '#9f1239',
    background: '#ffe4e6',
    borderColor: '#fecdd3'
  },
  '.cm-heading-inline-fold-level-2': {
    color: '#92400e',
    background: '#fff7ed',
    borderColor: '#fed7aa'
  },
  '.cm-heading-inline-fold-level-3': {
    color: '#166534',
    background: '#ecfdf5',
    borderColor: '#bbf7d0'
  },
  '.cm-heading-inline-fold-level-4': {
    color: '#155e75',
    background: '#ecfeff',
    borderColor: '#a5f3fc'
  },
  '.cm-heading-inline-fold-level-5': {
    color: '#1d4ed8',
    background: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  '.cm-heading-inline-fold-level-6': {
    color: '#6d28d9',
    background: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  '.cm-heading-hidden-content': {
    display: 'inline-block'
  },
  '.cm-sugar-depth-0': { color: '#a855f7' },
  '.cm-sugar-depth-1': { color: '#3b82f6' },
  '.cm-sugar-depth-2': { color: '#06b6d4' },
  '.cm-sugar-depth-3': { color: '#22c55e' },
  '.cm-sugar-depth-4': { color: '#f59e0b' },
  '.cm-sugar-depth-5': { color: '#f43f5e' },
  '.cm-color-preview': {
    display: 'inline-flex',
    position: 'relative',
    marginRight: '4px',
    verticalAlign: 'middle'
  },
  '.cm-color-swatch': {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    border: '1px solid #94a3b8',
    padding: '0',
    cursor: 'pointer'
  },
  '.cm-color-picker-panel': {
    display: 'none',
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: '0',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '4px',
    zIndex: '30',
    boxShadow: '0 6px 16px #0f172a26'
  },
  '.cm-color-preview:hover .cm-color-picker-panel, .cm-color-preview:focus-within .cm-color-picker-panel': {
    display: 'inline-flex'
  },
  '.cm-color-picker-input': {
    width: '24px',
    height: '24px',
    border: '0',
    background: 'transparent',
    padding: '0',
    cursor: 'pointer'
  }
});
