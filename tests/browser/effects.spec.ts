import { expect, test } from "@playwright/test";

async function raster(page: import("@playwright/test").Page) {
  return page
    .locator("canvas.home-ascii")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}

test("ASCII responds locally to the mouse and returns to the original scene", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Mobile retains the approved portrait without ASCII.",
  );
  await page.goto("/");
  await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
  const original = await raster(page);
  await page.mouse.move(840, 570);
  await expect.poll(() => raster(page)).not.toBe(original);
  await page.mouse.move(1950, 1110);
  await expect.poll(() => raster(page)).toBe(original);
});

test("Hovered ASCII settles on one replacement and restores after leaving the radius", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Mouse interaction is desktop-only.",
  );
  await page.goto("/");
  await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.clock.install();
  const original = await raster(page);
  await page.mouse.move(840, 570);
  await page.clock.runFor(1000);
  const hovered = await raster(page);
  expect(hovered).not.toBe(original);
  await page.clock.runFor(1000);
  expect(await raster(page)).toBe(hovered);
  // Stay inside the page, but leave the characters' interaction radius.
  await page.mouse.move(1700, 800);
  await page.clock.runFor(1000);
  expect(await raster(page)).toBe(original);
});

test("ASCII and photo use the same responsive viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop scene geometry.");
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 2560, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const measurements = await page.evaluate(() => {
      const canvas =
        document.querySelector<HTMLCanvasElement>("canvas.home-ascii")!;
      const photo = document.querySelector<HTMLImageElement>(
        ".home-scene .band-photo img",
      )!;
      const imageRect = photo.getBoundingClientRect();
      const layerRect = canvas.getBoundingClientRect();
      return {
        image: [imageRect.x, imageRect.y, imageRect.width, imageRect.height],
        layer: [layerRect.x, layerRect.y, layerRect.width, layerRect.height],
        fit: getComputedStyle(photo).objectFit,
      };
    });
    expect(measurements.layer).toEqual(measurements.image);
    expect(measurements.fit).toBe("cover");
  }
});

test("TV announcement scrolls and has a working pause control", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The approved mobile design has no announcement banner.",
  );
  await page.goto("/");
  const track = page.locator(".announcement__track");
  const initial = await track.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await expect
    .poll(() =>
      track.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(initial);
  await page.getByRole("button", { name: "Pausar anúncio" }).click();
  await expect(page.locator(".announcement")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Retomar anúncio" }).click();
  await page.mouse.move(400, 500);
  await page.locator("main").focus();
  await expect(track).toHaveCSS("animation-play-state", "running");
});

test("Reduced motion keeps the announcement and ASCII static", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop visual effects.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
  const original = await raster(page);
  await page.mouse.move(840, 570);
  expect(await raster(page)).toBe(original);
  await expect(page.locator(".announcement__track")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Pausar anúncio" }),
  ).toBeHidden();
});
