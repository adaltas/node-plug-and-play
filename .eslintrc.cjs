const tsConfig = require("./tsconfig.json");
// const tsTestConfig = require('./tsconfig.test.json');
module.exports = {
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module",
	},
	rules: {
		semi: 2,
		indent: ["error", 2],
	},
	overrides: [
		{
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
			],
			files: tsConfig.include,
			parser: "@typescript-eslint/parser",
			parserOptions: {
				project: ["./tsconfig.json"], // Specify it only for TypeScript files
			},
			plugins: ["@typescript-eslint/eslint-plugin", "eslint-plugin-tsdoc"],
		},
	],
	ignorePatterns: ["sample", "**/node_modules/*.[tj]s", "**/dist/**/*.[tj]s"],
};
