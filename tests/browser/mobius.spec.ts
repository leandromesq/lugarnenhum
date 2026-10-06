import { test, expect } from "@playwright/test";

async function ready(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator(".mobius")).toHaveAttribute("data-state", "ready", {
    timeout: 20000,
  });
  return page.getByRole("img", { name: "Faixa de Möbius 3D interativa" });
}

test("The real 3D model loads above the menu without pause buttons", async ({
  page,
}) => {
  await ready(page);
  const model = await page.locator(".mobius").boundingBox();
  const menu = await page
    .getByRole("navigation", { name: "Navegação principal" })
    .boundingBox();
  expect(model!.y + model!.height).toBeLessThan(menu!.y);
  expect(model!.x).toBeGreaterThan(page.viewportSize()!.width / 2);
  await expect(page.getByRole("button", { name: /rotação 3D/ })).toHaveCount(0);
  await page.getByRole("link", { name: /^(NOSSA )?LOJA$/ }).click();
  await expect(page).toHaveURL(/\/loja\/$/);
  await expect(page.locator(".mobius")).toHaveCount(0);
});

test("First pointer interaction has no square focus border; keyboard focus stays visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  await canvas.click();
  await expect(canvas).toHaveCSS("outline-style", "none");
  await canvas.press("ArrowRight");
  await expect(canvas).toHaveCSS("outline-style", "solid");
  await expect(canvas).toHaveCSS("outline-width", "2px");
  await canvas.click();
  await expect(canvas).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(canvas).toBeFocused();
  await expect(canvas).toHaveCSS("outline-style", "solid");
});

test("Reduced motion freezes automatic rotation while keyboard and drag still work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  await canvas.focus();
  const initial = await canvas.screenshot();
  await page.waitForTimeout(250);
  expect(await canvas.screenshot()).toEqual(initial);
  await canvas.press("ArrowRight");
  await expect
    .poll(async () => (await canvas.screenshot()).equals(initial))
    .toBe(false);
  const rotated = await canvas.screenshot();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 30,
    bounds.y + bounds.height / 2 + 15,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(rotated))
    .toBe(false);
});

test("Hover never pauses the fidget; dragging transfers momentum after release", async ({
  page,
}) => {
  const canvas = await ready(page);
  await canvas.hover();
  const initial = await canvas.screenshot();
  await page.waitForTimeout(300);
  expect((await canvas.screenshot()).equals(initial)).toBe(false);
  // Freeze RAF during input so a slow GPU cannot turn the driver's immediate
  // release into an intentional 100ms hold. Advance momentum explicitly below.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.clock.runFor(16);
  const held = await canvas.screenshot();
  await page.clock.runFor(200);
  expect(await canvas.screenshot()).toEqual(held);
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 30,
    bounds.y + bounds.height / 2 - 20,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.clock.runFor(16);
  const released = await canvas.screenshot();
  await page.clock.runFor(300);
  expect((await canvas.screenshot()).equals(released)).toBe(false);
  await canvas.press("Escape");
  await page.clock.runFor(100);
  const stopped = await canvas.screenshot();
  await page.clock.runFor(200);
  expect(await canvas.screenshot()).toEqual(stopped);
});

test("Idle restores the default spin, but never resets a held model", async ({
  page,
}) => {
  const canvas = await ready(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await canvas.hover();
  await page.mouse.down();
  await page.mouse.up();
  await page.clock.runFor(100);
  const idle = await canvas.screenshot();
  await page.clock.runFor(2800);
  expect(await canvas.screenshot()).toEqual(idle);
  await page.clock.fastForward(200);
  await page.clock.runFor(1100);
  const reset = await canvas.screenshot();
  await page.clock.runFor(350);
  expect((await canvas.screenshot()).equals(reset)).toBe(false);
  await canvas.hover();
  await page.mouse.down();
  const held = await canvas.screenshot();
  await page.clock.fastForward(10000);
  await page.clock.runFor(100);
  expect(await canvas.screenshot()).toEqual(held);
  await page.mouse.up();
});

test("Reduced motion does not automatically reset or resume after inactivity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  await page.clock.install();
  await canvas.press("ArrowUp");
  await page.clock.runFor(100);
  const rotated = await canvas.screenshot();
  await page.clock.fastForward(10000);
  expect(await canvas.screenshot()).toEqual(rotated);
});

test("A failed model download leaves navigation usable with an honest fallback", async ({
  page,
}) => {
  await page.route("**/assets/models/mobius-strip.glb", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Modelo 3D indisponível.", {
    timeout: 20000,
  });
  await page.getByRole("link", { name: /^(NOSSA )?LOJA$/ }).click();
  await expect(page).toHaveURL(/\/loja\/$/);
});

test("The black model stays transparent with a crisp white OutlinePass contour", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  // An arrow key schedules exactly one frame. Sample the drawing buffer inside
  // that same frame, before the compositor clears it: preserveDrawingBuffer is
  // off, so pixels are only readable while that frame is still current.
  const sample = await canvas.evaluate<
    {
      width: number;
      height: number;
      corners: number[];
      transparent: number;
      dark: number;
      bright: number;
      solidWhite: number;
      maxSum: number;
      brightWidth: number;
      brightHeight: number;
    },
    void,
    HTMLCanvasElement
  >(
    (element) =>
      new Promise((resolve) => {
        const gl = element.getContext("webgl2");
        if (!gl) throw new Error("WebGL2 context is unavailable");
        const context: WebGL2RenderingContext = gl;

        function read(attempt: number) {
          element.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
          );
          requestAnimationFrame(() => {
            const width = context.drawingBufferWidth;
            const height = context.drawingBufferHeight;
            const pixels = new Uint8Array(width * height * 4);
            context.readPixels(
              0,
              0,
              width,
              height,
              context.RGBA,
              context.UNSIGNED_BYTE,
              pixels,
            );
            let transparent = 0;
            let dark = 0;
            let bright = 0;
            let solidWhite = 0;
            let maxSum = 0;
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;
            for (let y = 0; y < height; y += 1) {
              for (let x = 0; x < width; x += 1) {
                const index = (y * width + x) * 4;
                const red = pixels[index];
                const green = pixels[index + 1];
                const blue = pixels[index + 2];
                const alpha = pixels[index + 3];
                const sum = red + green + blue;
                if (sum > maxSum) maxSum = sum;
                if (alpha === 255 && red >= 250 && green >= 250 && blue >= 250)
                  solidWhite++;
                if (alpha === 0) transparent += 1;
                // Opaque pixels darker than mid grey: the supplied black material.
                else if (sum < 384) dark += 1;
                // Bright premultiplied pixels: the white OutlinePass contour.
                if (alpha > 150 && sum > 480) {
                  bright += 1;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (dark === 0 && attempt > 0) {
              read(attempt - 1);
              return;
            }
            resolve({
              width,
              height,
              corners: [
                pixels[3],
                pixels[(width - 1) * 4 + 3],
                pixels[(height - 1) * width * 4 + 3],
                pixels[(width * height - 1) * 4 + 3],
              ],
              transparent,
              dark,
              bright,
              solidWhite,
              maxSum,
              brightWidth: maxX - minX + 1,
              brightHeight: maxY - minY + 1,
            });
          });
        }
        read(2);
      }),
  );

  const total = sample.width * sample.height;
  // Empty pixels keep alpha 0: the canvas is transparent, not a black backing.
  expect(sample.corners).toEqual([0, 0, 0, 0]);
  expect(sample.transparent / total).toBeGreaterThan(0.15);
  // The supplied dark material covers a real part of the canvas.
  expect(sample.dark / total).toBeGreaterThan(0.02);
  // A white contour spreads around it, staying thin enough to be crisp.
  expect(sample.maxSum).toBeGreaterThan(600);
  expect(sample.bright).toBeGreaterThan(24);
  // Flat graphic ink, not a soft glow: almost every bright pixel is solid white.
  expect(sample.solidWhite / sample.bright).toBeGreaterThan(0.9);
  expect(sample.bright / total).toBeLessThan(0.15);
  expect(sample.brightWidth).toBeGreaterThan(sample.width * 0.4);
  expect(sample.brightHeight).toBeGreaterThan(sample.height * 0.4);
});
