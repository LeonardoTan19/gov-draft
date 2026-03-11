import { StateEffect, StateField, type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';

const SUGAR_OPEN_PATTERN = /^\s*:::\s+\S/;
const SUGAR_CLOSE_PATTERN = /^\s*:::\s*$/;

interface SugarInteractionState {
  hoveredLine: number | null;
  cursorLine: number | null;
}

const setHoveredLineEffect = StateEffect.define<number | null>();
const setCursorLineEffect = StateEffect.define<number | null>();
const SUGAR_HOVER_EXPAND_DELAY_MS = 80;

const sugarInteractionField = StateField.define<SugarInteractionState>({
  create() {
    return {
      hoveredLine: null,
      cursorLine: null
    };
  },
  update(value, transaction) {
    let nextValue = value;

    for (const effect of transaction.effects) {
      if (effect.is(setHoveredLineEffect)) {
        nextValue = {
          ...nextValue,
          hoveredLine: effect.value
        };
      }
      if (effect.is(setCursorLineEffect)) {
        nextValue = {
          ...nextValue,
          cursorLine: effect.value
        };
      }
    }

    return nextValue;
  }
});

class SugarCollapsedWidget extends WidgetType {
  toDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = 'cm-sugar-collapsed-text';
    element.textContent = ' …';
    return element;
  }
}

function resolveSugarTokenStart(lineFrom: number, lineText: string): number {
  const tokenStartOffset = lineText.indexOf(':::');
  return tokenStartOffset >= 0 ? lineFrom + tokenStartOffset : lineFrom;
}

function isExpandedByLine(
  interaction: SugarInteractionState,
  lineNumber: number,
  pairLine: number | undefined
): boolean {
  if (interaction.hoveredLine === lineNumber || interaction.cursorLine === lineNumber) {
    return true;
  }

  if (pairLine === undefined) {
    return false;
  }

  return interaction.hoveredLine === pairLine || interaction.cursorLine === pairLine;
}

function buildSugarDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const depthStack: number[] = [];
  const doc = state.doc;
  const interaction = state.field(sugarInteractionField);
  const blockStack: Array<{ startLine: number }> = [];
  const closedBlocks: Array<{ startLine: number; endLine: number }> = [];

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const lineText = doc.line(lineNumber).text;
    if (SUGAR_OPEN_PATTERN.test(lineText)) {
      blockStack.push({ startLine: lineNumber });
      continue;
    }
    if (SUGAR_CLOSE_PATTERN.test(lineText) && blockStack.length > 0) {
      const open = blockStack.pop();
      if (open) {
        closedBlocks.push({
          startLine: open.startLine,
          endLine: lineNumber
        });
      }
    }
  }

  const pairedLines = new Map<number, number>();
  for (const item of closedBlocks) {
    pairedLines.set(item.startLine, item.endLine);
    pairedLines.set(item.endLine, item.startLine);
  }

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const lineText = line.text;

    if (SUGAR_OPEN_PATTERN.test(lineText)) {
      const depth = depthStack.length;
      depthStack.push(depth);
      const depthClass = `cm-sugar-depth-${depth % 6}`;
      const tokenStart = resolveSugarTokenStart(line.from, lineText);
      const descriptorFrom = Math.min(tokenStart + 3, line.to);
      const pairLine = pairedLines.get(lineNumber);
      const isExpanded = isExpandedByLine(interaction, lineNumber, pairLine);

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          class: `${isExpanded ? 'cm-sugar-line-expanded' : 'cm-sugar-line-collapsed'} ${depthClass}`
        })
      );

      builder.add(
        tokenStart,
        tokenStart + 3,
        Decoration.mark({
          class: `cm-sugar-token ${depthClass} ${isExpanded ? 'cm-sugar-token-expanded' : 'cm-sugar-token-collapsed'}`
        })
      );

      if (!isExpanded && descriptorFrom < line.to) {
        builder.add(
          descriptorFrom,
          line.to,
          Decoration.replace({
            widget: new SugarCollapsedWidget(),
            inclusive: false
          })
        );
      }
      continue;
    }

    if (SUGAR_CLOSE_PATTERN.test(lineText) && depthStack.length > 0) {
      const depth = depthStack.pop() ?? 0;
      const depthClass = `cm-sugar-depth-${depth % 6}`;
      const tokenStart = resolveSugarTokenStart(line.from, lineText);
      const pairLine = pairedLines.get(lineNumber);
      const isExpanded = isExpandedByLine(interaction, lineNumber, pairLine);

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          class: `${isExpanded ? 'cm-sugar-line-expanded' : 'cm-sugar-line-collapsed'} ${depthClass}`
        })
      );

      builder.add(
        tokenStart,
        tokenStart + 3,
        Decoration.mark({
          class: `cm-sugar-token ${depthClass} ${isExpanded ? 'cm-sugar-token-expanded' : 'cm-sugar-token-collapsed'}`
        })
      );
      continue;
    }
  }

  return builder.finish();
}

const sugarDecorations = EditorView.decorations.compute(
  ['doc', sugarInteractionField],
  (state) => buildSugarDecorations(state)
);

export function createSugarFoldExtension(): Extension {
  let hoverTimer: number | null = null;
  let pendingHoveredLine: number | null = null;

  return [
    sugarInteractionField,
    sugarDecorations,
    EditorView.updateListener.of((update) => {
      if (!update.selectionSet) {
        return;
      }
      const lineNumber = update.state.doc.lineAt(update.state.selection.main.head).number;
      const current = update.state.field(sugarInteractionField);
      if (current.cursorLine === lineNumber) {
        return;
      }
      update.view.dispatch({
        effects: setCursorLineEffect.of(lineNumber)
      });
    }),
    EditorView.domEventHandlers({
      mousemove(event, view) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return false;
        }
        const pos = view.posAtDOM(target, 0);
        if (pos < 0) {
          return false;
        }
        const lineNumber = view.state.doc.lineAt(pos).number;
        const current = view.state.field(sugarInteractionField);
        if (current.hoveredLine === lineNumber || pendingHoveredLine === lineNumber) {
          return false;
        }
        if (hoverTimer !== null) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        pendingHoveredLine = lineNumber;
        hoverTimer = window.setTimeout(() => {
          hoverTimer = null;
          const latest = view.state.field(sugarInteractionField);
          if (latest.hoveredLine === pendingHoveredLine) {
            return;
          }
          view.dispatch({
            effects: setHoveredLineEffect.of(pendingHoveredLine)
          });
        }, SUGAR_HOVER_EXPAND_DELAY_MS);
        return false;
      },
      mouseleave(_event, view) {
        if (hoverTimer !== null) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        pendingHoveredLine = null;
        const current = view.state.field(sugarInteractionField);
        if (current.hoveredLine === null) {
          return false;
        }
        view.dispatch({
          effects: setHoveredLineEffect.of(null)
        });
        return false;
      }
    })
  ];
}
