import nextVitals from "eslint-config-next/core-web-vitals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "outputs/**",
      "logs/**",
      ".codex-build/**",
      "*.config.*",
    ],
  },
  ...nextVitals,
  {
    // Next 16 membawa aturan React Compiler yang menandai pola lama
    // (inisialisasi state dari localStorage/props di effect). Tetap terlihat
    // sebagai peringatan agar tidak menutupi error nyata, tanpa mematikan
    // pemeriksaan lain.
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
];
