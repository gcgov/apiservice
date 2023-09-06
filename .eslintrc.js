module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'eslint:recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
	  "no-unused-vars":           [
		  "warn",
		  {
			  "vars": "all",
			  "args": "after-used"
		  }
	  ],
	  "no-mixed-spaces-and-tabs": [
		  "error",
		  "smart-tabs"
	  ],
    'no-console': 'warn',
    'no-debugger': 'warn'
  }
}
