module.exports = {
  'env': {
    'node': true,
    'es6': true,
  },
  'parserOptions': {
    'ecmaVersion': 2018,
  },
  'globals': {
  },
  'rules': {
    'semi': 1,
    'no-bitwise': 2,
    'camelcase': 0,
    'curly': 2,
    'guard-for-in': 2,
    'no-trailing-spaces': 1,
    'indent': [1, 2],
    'wrap-iife': [
      2,
      'any'
    ],
    'no-use-before-define': [
      2,
      {
        'functions': false,
      }
    ],
    'max-len': [
      2,
      {
        'code': 140,
        'ignoreComments': true,
      }
    ],
    'new-cap': 2,
    'no-caller': 2,
    'no-empty': 2,
    'no-new': 2,
    'quotes': [
      1,
      'single',
      { 'avoidEscape': true, }
    ],
    'no-undef': 2,
    'no-unused-vars': [2, {
      argsIgnorePattern: '^_',
    }],
    'comma-dangle': ['error', {
      'arrays': 'never',
      'objects': 'always',
      'imports': 'never',
      'exports': 'never',
      'functions': 'never',
    }],
    'eol-last': ['error', 'always'],
    'space-before-function-paren': ['warn', 'never'],
    'object-property-newline': ['warn', {'allowAllPropertiesOnSameLine': true,}],
  },
};
