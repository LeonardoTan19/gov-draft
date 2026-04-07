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
    color: 'var(--text-primary)',
    background: 'var(--panel-bg)',
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '14px',
    color: 'var(--text-primary)',
    background: 'var(--panel-bg)',
    caretColor: 'var(--text-primary)'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--text-primary)'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'hsl(var(--primary) / 0.24)'
  },
  '.cm-gutters': {
    border: '0',
    color: 'var(--text-secondary)',
    background: 'var(--panel-bg)'
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
    color: 'var(--text-secondary)',
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
    marginRight: '4px',
    verticalAlign: 'middle'
  },
  '.cm-color-swatch': {
    width: '11px',
    height: '11px',
    borderRadius: '2px',
    border: '1px solid #00000066',
    padding: '0',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px #ffffff66'
  },
  '.cm-color-picker-panel': {
    position: 'absolute',
    width: '220px',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '10px',
    zIndex: '40',
    boxShadow: 'var(--shadow-lg)',
    display: 'none',
    flexDirection: 'column',
    gap: '8px'
  },
  '.cm-color-picker-panel.cm-color-picker-panel-open': {
    display: 'flex'
  },
  '.cm-color-picker-panel.cm-color-picker-panel-hidden': {
    display: 'none'
  },
  '.cm-color-panel-preview': {
    width: '100%',
    height: '20px',
    borderRadius: '3px',
    border: '1px solid var(--border-color)',
    backgroundImage:
      'linear-gradient(45deg, var(--border-color) 25%, transparent 25%), linear-gradient(-45deg, var(--border-color) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--border-color) 75%), linear-gradient(-45deg, transparent 75%, var(--border-color) 75%)',
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
  },
  '.cm-color-panel-sat': {
    position: 'relative',
    width: '100%',
    height: '120px',
    borderRadius: '3px',
    border: '1px solid var(--border-color)',
    cursor: 'crosshair',
    backgroundImage:
      'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
  },
  '.cm-color-panel-cursor': {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid var(--panel-bg)',
    boxShadow: '0 0 0 1px var(--tooltip-shadow)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none'
  },
  '.cm-color-panel-range': {
    width: '100%',
    margin: '0',
    height: '16px',
    appearance: 'none',
    background: 'transparent',
    cursor: 'pointer'
  },
  '.cm-color-panel-hue': {
    background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    borderRadius: '999px'
  },
  '.cm-color-panel-alpha': {
    borderRadius: '999px'
  },
  '.cm-color-panel-range::-webkit-slider-runnable-track': {
    height: '8px',
    borderRadius: '999px',
    border: '1px solid var(--border-color)'
  },
  '.cm-color-panel-hue::-webkit-slider-runnable-track': {
    background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
  },
  '.cm-color-panel-alpha::-webkit-slider-runnable-track': {
    background: 'var(--cm-color-alpha-track, linear-gradient(90deg, transparent, #ffffff))'
  },
  '.cm-color-panel-range::-webkit-slider-thumb': {
    appearance: 'none',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    background: 'var(--panel-bg)',
    marginTop: '-3px',
    boxShadow: '0 0 0 1px #ffffff66'
  },
  '.cm-color-panel-range::-moz-range-track': {
    height: '8px',
    borderRadius: '999px',
    border: '1px solid var(--border-color)'
  },
  '.cm-color-panel-hue::-moz-range-track': {
    background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
  },
  '.cm-color-panel-alpha::-moz-range-track': {
    background: 'var(--cm-color-alpha-track, linear-gradient(90deg, transparent, #ffffff))'
  },
  '.cm-color-panel-range::-moz-range-thumb': {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '1px solid var(--border-color)',
    background: 'var(--panel-bg)',
    boxShadow: '0 0 0 1px #ffffff66'
  },
  '.cm-color-panel-text': {
    width: '100%',
    height: '28px',
    border: '1px solid var(--border-color)',
    borderRadius: '3px',
    background: 'var(--app-bg)',
    color: 'var(--text-primary)',
    padding: '0 8px',
    fontSize: '12px',
    outline: 'none'
  },
  '.cm-color-panel-text:focus': {
    borderColor: 'var(--brand-primary)'
  }
});
