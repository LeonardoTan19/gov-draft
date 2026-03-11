/* eslint-disable no-undef */

const ALLOWED_TYPES = ["feat", "fix", "refactor", "docs", "test", "chore"];

/**
 * Ensure body is 2-5 bullet lines and every non-empty line starts with "- ".
 */
const bodyBulletListCount = (parsed) => {
  const body = parsed.body ?? "";
  const nonEmptyLines = body
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (nonEmptyLines.length === 0) {
    return [false, "commit body is required and must contain 2-5 bullet lines"];
  }

  const bulletLines = nonEmptyLines.filter((line) => line.startsWith("- "));
  const hasOnlyBulletLines = bulletLines.length === nonEmptyLines.length;
  const hasValidCount = bulletLines.length >= 2 && bulletLines.length <= 5;

  return [
    hasOnlyBulletLines && hasValidCount,
    "commit body must be 2-5 bullet lines and each non-empty line must start with '- '",
  ];
};

module.exports = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "body-bullet-list-count": bodyBulletListCount,
      },
    },
  ],
  rules: {
    "type-enum": [2, "always", ALLOWED_TYPES],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "body-empty": [2, "never"],
    "body-leading-blank": [2, "always"],
    "body-bullet-list-count": [2, "always"],
  },
};
