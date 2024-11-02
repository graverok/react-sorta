import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      name: "react-sorta",
      entry: resolve(__dirname, "src/index.tsx"),
      formats: ["es", "umd"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      output: {
        globals: {
          "react": "React",
          "react/jsx-runtime": "ReactJsxRuntime",
        },
      },
    },
  },
  plugins: [dts({ insertTypesEntry: true })],
});
