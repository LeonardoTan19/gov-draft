import { StateEffect, StateField, type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { getLockedSugarLine } from './sugarHoverLock';

const SUGAR_OPEN_PATTERN = /^\s*:::\s+\S/;
const SUGAR_CLOSE_PATTERN = /^\s*:::\s*$/;

interface SugarInteractionState {
  hoveredLine: number | null;
  cursorLine: number | null;
}

interface SugarBlock {
  startLine: number;
  endLine: number;
  parentStartLine: number | null;
}

export const setSugarHoveredLineEffect = StateEffect.define<number | null>();
const setCursorLineEffect = StateEffect.define<number | null>();
const SUGAR_HOVER_EXPAND_DELAY_MS = 100;

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
      if (effect.is(setSugarHoveredLineEffect)) {
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
  expandedLines: ReadonlySet<number>,
  lineNumber: number
): boolean {
  return expandedLines.has(lineNumber);
}

function collectExpandedLines(
  interaction: SugarInteractionState,
  pairedLines: ReadonlyMap<number, number>,
  blocksByBoundaryLine: ReadonlyMap<number, SugarBlock>
): Set<number> {
  const expandedLines = new Set<number>();
  const queue: number[] = [];

  const enqueue = (lineNumber: number | null | undefined): void => {
    if (lineNumber == null || expandedLines.has(lineNumber)) {
      return;
    }
    expandedLines.add(lineNumber);
    queue.push(lineNumber);
  };

  enqueue(interaction.hoveredLine);
  enqueue(interaction.cursorLine);

  while (queue.length > 0) {
    const lineNumber = queue.shift();
    if (lineNumber === undefined) {
      continue;
    }

    const pairLine = pairedLines.get(lineNumber);
    if (pairLine !== undefined) {
      enqueue(pairLine);
    }

    const block = blocksByBoundaryLine.get(lineNumber);
    if (!block || block.parentStartLine == null) {
      continue;
    }

    enqueue(block.parentStartLine);
    const parentEndLine = pairedLines.get(block.parentStartLine);
    if (parentEndLine !== undefined) {
      enqueue(parentEndLine);
    }
  }

  return expandedLines;
}

function buildSugarDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const depthStack: number[] = [];
  const doc = state.doc;
  const interaction = state.field(sugarInteractionField);
  const blockStack: Array<{ startLine: number; parentStartLine: number | null }> = [];
  const closedBlocks: SugarBlock[] = [];

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const lineText = doc.line(lineNumber).text;
    if (SUGAR_OPEN_PATTERN.test(lineText)) {
      const parent = blockStack[blockStack.length - 1];
      blockStack.push({
        startLine: lineNumber,
        parentStartLine: parent?.startLine ?? null
      });
      continue;
    }
    if (SUGAR_CLOSE_PATTERN.test(lineText) && blockStack.length > 0) {
      const open = blockStack.pop();
      if (open) {
        closedBlocks.push({
          startLine: open.startLine,
          endLine: lineNumber,
          parentStartLine: open.parentStartLine
        });
      }
    }
  }

  const pairedLines = new Map<number, number>();
  const blocksByBoundaryLine = new Map<number, SugarBlock>();
  for (const item of closedBlocks) {
    pairedLines.set(item.startLine, item.endLine);
    pairedLines.set(item.endLine, item.startLine);
    blocksByBoundaryLine.set(item.startLine, item);
    blocksByBoundaryLine.set(item.endLine, item);
  }
  const expandedLines = collectExpandedLines(interaction, pairedLines, blocksByBoundaryLine);

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const lineText = line.text;

    if (SUGAR_OPEN_PATTERN.test(lineText)) {
      const depth = depthStack.length;
      depthStack.push(depth);
      const depthClass = `cm-sugar-depth-${depth % 6}`;
      const tokenStart = resolveSugarTokenStart(line.from, lineText);
      const descriptorFrom = Math.min(tokenStart + 3, line.to);
      const isExpanded = isExpandedByLine(expandedLines, lineNumber);

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
      const isExpanded = isExpandedByLine(expandedLines, lineNumber);

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

  const clearHoverTimer = (): void => {
    if (hoverTimer !== null) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  };

  const dispatchHoveredLineIfChanged = (view: EditorView, lineNumber: number | null): void => {
    const current = view.state.field(sugarInteractionField);
    if (current.hoveredLine === lineNumber) {
      return;
    }
    view.dispatch({
      effects: setSugarHoveredLineEffect.of(lineNumber)
    });
  };

  const applyLockedHoverIfPresent = (view: EditorView): boolean => {
    const lockedLine = getLockedSugarLine(view);
    if (lockedLine === null) {
      return false;
    }
    clearHoverTimer();
    pendingHoveredLine = null;
    dispatchHoveredLineIfChanged(view, lockedLine);
    return true;
  };

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
        if (applyLockedHoverIfPresent(view)) {
          return false;
        }

        const current = view.state.field(sugarInteractionField);
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return false;
        }
        const pos = view.posAtDOM(target, 0);
        if (pos < 0) {
          return false;
        }
        const lineNumber = view.state.doc.lineAt(pos).number;
        if (current.hoveredLine === lineNumber || pendingHoveredLine === lineNumber) {
          return false;
        }
        clearHoverTimer();
        pendingHoveredLine = lineNumber;
        hoverTimer = window.setTimeout(() => {
          hoverTimer = null;
          const latest = view.state.field(sugarInteractionField);
          if (latest.hoveredLine === pendingHoveredLine) {
            return;
          }
          view.dispatch({
            effects: setSugarHoveredLineEffect.of(pendingHoveredLine)
          });
        }, SUGAR_HOVER_EXPAND_DELAY_MS);
        return false;
      },
      mouseleave(_event, view) {
        if (applyLockedHoverIfPresent(view)) {
          return false;
        }

        const current = view.state.field(sugarInteractionField);
        clearHoverTimer();
        pendingHoveredLine = null;
        if (current.hoveredLine === null) {
          return false;
        }
        view.dispatch({
          effects: setSugarHoveredLineEffect.of(null)
        });
        return false;
      }
    })
  ];
}
