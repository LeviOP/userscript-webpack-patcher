import stylistic from "@stylistic/eslint-plugin";
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ["dist"] },
    {
        files: ["src/**/*.ts"],
        plugins: {
            "@stylistic": stylistic,
            "@typescript-eslint": tseslint.plugin
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            "@stylistic/quotes": ["error", "double", { "avoidEscape": true }],
            "@stylistic/arrow-parens": ["error", "always"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/semi": ["error", "always"],
            "@stylistic/semi-style": ["error", "last"],
            "@stylistic/space-in-parens": ["error", "never"],
            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/spaced-comment": ["error", "always", { "markers": ["!"] }],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/function-call-spacing": ["error", "never"],
            "@stylistic/comma-dangle": ["error", "never"],
            "@stylistic/member-delimiter-style": "error",
            "@stylistic/indent": "error",

            "@typescript-eslint/consistent-type-imports": "error",

            "yoda": "error",
            "eqeqeq": ["error", "always"],
            "operator-assignment": ["error", "always"],
            "no-useless-computed-key": "error",
            "no-unneeded-ternary": ["error", { "defaultAssignment": false }],
            "no-invalid-regexp": "error",
            "no-constant-condition": ["error", { "checkLoops": false }],
            "no-duplicate-imports": "error",
            "no-useless-escape": "error",
            "no-fallthrough": "error",
            "for-direction": "error",
            "no-async-promise-executor": "error",
            "no-cond-assign": "error",
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-irregular-whitespace": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-shadow-restricted-names": "error",
            "no-unexpected-multiline": "error",
            "no-unsafe-optional-chaining": "error",
            "no-useless-backreference": "error",
            "use-isnan": "error",
            "prefer-const": ["error", { destructuring: "all" }],
            "prefer-spread": "error"
        }
    }
);
