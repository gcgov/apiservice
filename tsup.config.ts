import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/ApiService.ts"],
    format: ["esm"], // Build for commonJS and ESmodules
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    clean: true,
});
