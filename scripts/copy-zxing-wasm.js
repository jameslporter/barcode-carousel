// Copies the ZXing WebAssembly decoder into public/ so the web build serves it
// itself, instead of the barcode-detector package fetching it from a CDN at
// scan time. Runs on postinstall so it always matches the installed version.
const fs = require("fs");
const path = require("path");

const src = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const dest = path.join(__dirname, "..", "public", "zxing_reader.wasm");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${path.relative(process.cwd(), src)} -> public/`);
