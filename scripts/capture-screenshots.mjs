// Captures every page in desktop and mobile viewports for visual review.
// usage: node scripts/capture-screenshots.mjs <base URL> <output directory>
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const [base, outDir] = process.argv.slice(2);
if (!base || !outDir)
  throw new Error(
    "Usage: node scripts/capture-screenshots.mjs <base URL> <output directory>",
  );

const pages = [
  ["inicio", "/"],
  ["musica", "/musica/"],
  ["loja", "/loja/"],
  ["quem-somos", "/quem-somos/"],
  ["presskit", "/presskit/"],
];
// The device preset names WebKit; the context options must not carry it.
const iphone = { ...devices["iPhone 13"] };
delete iphone.defaultBrowserType;
const viewports = [
  ["desktop", { viewport: { width: 1920, height: 1080 } }],
  ["celular", iphone],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
try {
  for (const [viewportName, options] of viewports) {
    const context = await browser.newContext(options);
    for (const [pageName, path] of pages) {
      const page = await context.newPage();
      await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
      // Let lazy WebGL scenes and fonts settle before the capture.
      await page.waitForTimeout(2500);
      const file = join(outDir, `${pageName}-${viewportName}.jpg`);
      await page.screenshot({
        path: file,
        fullPage: true,
        type: "jpeg",
        quality: 80,
      });
      console.log(file);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
