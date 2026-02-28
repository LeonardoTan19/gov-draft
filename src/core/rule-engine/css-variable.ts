const CAMEL_CASE_SEGMENT_PATTERN = /([a-z0-9])([A-Z])/g;

function normalizePathSegment(segment: string): string {
  return segment
    .replace(CAMEL_CASE_SEGMENT_PATTERN, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function toCssCustomProperty(path: string): string {
  const normalizedPath = path
    .trim()
    .split('.')
    .map((segment) => normalizePathSegment(segment))
    .filter((segment) => segment.length > 0)
    .join('-');

  return `--${normalizedPath}`;
}
