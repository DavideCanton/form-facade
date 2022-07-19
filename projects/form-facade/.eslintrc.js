module.exports = {
    extends: ['../../.eslintrc.js'],
    rules: {
        '@angular-eslint/component-class-suffix': 'error',
        '@angular-eslint/component-selector': [
            'error',
            {
                type: 'element',
                prefix: 'ff',
                style: 'kebab-case',
            },
        ],
        '@angular-eslint/directive-class-suffix': 'error',
        '@angular-eslint/directive-selector': [
            'error',
            {
                type: 'attribute',
                prefix: 'ff',
                style: 'camelCase',
            },
        ],
    },
};
