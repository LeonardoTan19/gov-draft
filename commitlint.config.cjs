/* eslint-disable no-undef */

const ALLOWED_TYPES = ["feat", "fix", "refactor", "docs", "test", "chore", "merge"];

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ALLOWED_TYPES],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "body-empty": [0],
    "body-leading-blank": [0],
  },
};
