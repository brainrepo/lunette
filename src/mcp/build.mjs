import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/server.js",
  banner: { js: "#!/usr/bin/env node" },
  minify: false,
});
