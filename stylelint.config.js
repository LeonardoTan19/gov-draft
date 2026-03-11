export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-html/vue'],
  rules: {
    'no-duplicate-selectors': true,
    'max-nesting-depth': 3,
    'selector-max-compound-selectors': 4,
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*)|--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$',
    'color-function-notation': 'legacy',
    'alpha-value-notation': 'number',
    'font-family-name-quotes': null,
    'color-hex-length': null,
    'color-function-alias-notation': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'property-no-vendor-prefix': null,
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['deep', 'global']
      }
    ],
    'scss/at-if-no-null': null
  }
}
