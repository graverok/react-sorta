import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      name: "react-sorta",
      entry: resolve(__dirname, "src/index.tsx"),
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          "react": "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "ReactJsxRuntime",
        },
      },
    },
  },
  plugins: [dts({ insertTypesEntry: true })],
});
