import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { prettier: prettierPlugin, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'prettier/prettier': 'error',
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
