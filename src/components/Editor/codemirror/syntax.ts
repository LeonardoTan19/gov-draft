import type { Text } from '@codemirror/state';
import type { HeadingBlock } from './types';

const HEADING_PATTERN = /^(#{1,6})\s+.+$/;

export function parseHeadingBlocks(doc: Text): HeadingBlock[] {
  const headings: Array<{ lineNumber: number; level: number; from: number; to: number }> = [];

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const match = line.text.match(HEADING_PATTERN);
    if (!match) {
      continue;
    }
    const level = match[1]?.length ?? 1;
    headings.push({
      lineNumber,
      level,
      from: line.from,
      to: line.to
    });
  }

  return headings.map((current, index) => {
    let foldTo = doc.length;

    for (let nextIndex = index + 1; nextIndex < headings.length; nextIndex += 1) {
      const nextHeading = headings[nextIndex];
      if (!nextHeading) {
        continue;
      }
      if (nextHeading.level <= current.level) {
        foldTo = nextHeading.from - 1;
        break;
      }
    }

    return {
      id: `heading-${current.lineNumber}-${current.from}`,
      lineNumber: current.lineNumber,
      level: current.level,
      from: current.from,
      to: current.to,
      foldFrom: Math.min(current.to + 1, doc.length),
      foldTo
    };
  });
}
