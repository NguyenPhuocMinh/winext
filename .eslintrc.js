module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'for-direction': 'error',
    'no-await-in-loop': 'error',
    'no-compare-neg-zero': 'error',
    semi: [
      'error',
      'always'
    ],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }
    ],
    quotes: [
      'error',
      'single', {
        allowTemplateLiterals: true
      }
    ],
    'eol-last': ['error'],
    'no-extra-semi': 'error',
    'no-extra-parens': ['error', 'all', { nestedBinaryExpressions: false }],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'new-cap': ['error',
      { properties: false }
    ],
    camelcase: ['error',
      {
        ignoreDestructuring: true
      }
    ],
    'getter-return': [
      'error',
      {
        allowImplicit: true
      }
    ]
  }
};
