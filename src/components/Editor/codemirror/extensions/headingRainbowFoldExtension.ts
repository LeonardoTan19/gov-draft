import { EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, WidgetType, gutter, type DecorationSet } from '@codemirror/view';
import { parseHeadingBlocks } from '../syntax';
import { i18n } from '../../../../locales';

const toggleHeadingFoldEffect = StateEffect.define<string>();

const headingBlocksField = StateField.define<ReturnType<typeof parseHeadingBlocks>>({
  create(state) {
    return parseHeadingBlocks(state.doc);
  },
  update(value, transaction) {
    if (!transaction.docChanged) {
      return value;
    }
    return parseHeadingBlocks(transaction.newDoc);
  }
});

const headingFoldField = StateField.define<Set<string>>({
  create() {
    return new Set<string>();
  },
  update(value, transaction) {
    const next = new Set(value);

    for (const effect of transaction.effects) {
      if (!effect.is(toggleHeadingFoldEffect)) {
        continue;
      }
      const id = effect.value;
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }

    return next;
  }
});

class FoldMarker extends GutterMarker {
  private readonly folded: boolean;

  constructor(folded: boolean) {
    super();
    this.folded = folded;
  }

  toDOM(): HTMLElement {
    const t = i18n.global.t;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'cm-heading-fold-button';
    marker.textContent = this.folded ? '▸' : '▾';
    marker.setAttribute('aria-label', this.folded ? t('codemirror.expandHeading') : t('codemirror.collapseHeading'));
    return marker;
  }
}

class HeadingFoldedWidget extends WidgetType {
  private readonly headingId: string;
  private readonly headingLevel: number;

  constructor(headingId: string, headingLevel: number) {
    super();
    this.headingId = headingId;
    this.headingLevel = headingLevel;
  }

  eq(other: HeadingFoldedWidget): boolean {
    return other.headingId === this.headingId && other.headingLevel === this.headingLevel;
  }

  toDOM(): HTMLElement {
    const t = i18n.global.t;
    const foldedButton = document.createElement('button');
    foldedButton.type = 'button';
    foldedButton.className = `cm-heading-inline-fold cm-heading-inline-fold-level-${Math.min(this.headingLevel, 6)}`;
    foldedButton.textContent = '...';
    foldedButton.dataset.headingId = this.headingId;
    foldedButton.setAttribute('aria-label', t('codemirror.expandHeading'));
    return foldedButton;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class HiddenContentWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hidden = document.createElement('span');
    hidden.className = 'cm-heading-hidden-content';
    hidden.textContent = '';
    return hidden;
  }
}

function buildHeadingDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const headings = state.field(headingBlocksField);
  const folded = state.field(headingFoldField);

  for (const heading of headings) {
    builder.add(
      heading.from,
      heading.from,
      Decoration.line({
        class: `cm-heading-rainbow cm-heading-level-${Math.min(heading.level, 6)}`
      })
    );

    if (folded.has(heading.id) && heading.foldTo > heading.foldFrom) {
      builder.add(
        heading.to,
        heading.to,
        Decoration.widget({
          widget: new HeadingFoldedWidget(heading.id, heading.level),
          side: 1
        })
      );

      builder.add(
        heading.foldFrom,
        heading.foldTo,
        Decoration.replace({
          widget: new HiddenContentWidget(),
          inclusive: false
        })
      );
    }
  }

  return builder.finish();
}

const headingDecorations = EditorView.decorations.compute(
  [headingBlocksField, headingFoldField],
  (state) => buildHeadingDecorations(state)
);

export function createHeadingRainbowFoldExtension(): Extension {
  return [
    headingBlocksField,
    headingFoldField,
    headingDecorations,
    gutter({
      class: 'cm-heading-fold-gutter',
      markers(view) {
        const builder = new RangeSetBuilder<GutterMarker>();
        const headings = view.state.field(headingBlocksField);
        const folded = view.state.field(headingFoldField);

        for (const heading of headings) {
          builder.add(heading.from, heading.from, new FoldMarker(folded.has(heading.id)));
        }

        return builder.finish();
      },
      domEventHandlers: {
        mousedown(view, block) {
          const headings = view.state.field(headingBlocksField);
          const heading = headings.find((item) => item.from === block.from);
          if (!heading) {
            return false;
          }
          view.dispatch({
            effects: toggleHeadingFoldEffect.of(heading.id)
          });
          return true;
        }
      }
    }),
    EditorView.domEventHandlers({
      click(event, view) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return false;
        }
        const button = target.closest('.cm-heading-inline-fold');
        if (!(button instanceof HTMLElement)) {
          return false;
        }
        const headingId = button.dataset.headingId;
        if (!headingId) {
          return false;
        }
        view.dispatch({
          effects: toggleHeadingFoldEffect.of(headingId)
        });
        return true;
      }
    })
  ];
}
