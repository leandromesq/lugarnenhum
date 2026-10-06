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

test("Hovered ASCII alternates slowly under a stationary pointer and restores on exit", async ({
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
  const states = new Set([hovered]);
  for (let sample = 0; sample < 6; sample++) {
    await page.clock.runFor(250);
    states.add(await raster(page));
  }
  expect(states.size).toBeGreaterThan(1);
  // Stay inside the page, but leave the characters' interaction radius.
  await page.mouse.move(1700, 800);
  await page.clock.runFor(1000);
  expect(await raster(page)).toBe(original);
  await page.clock.runFor(2000);
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

test("TV announcement scrolls, pauses on hover, and resumes when the pointer leaves", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The approved mobile design has no announcement banner.",
  );
  await page.goto("/");
  const announcement = page.locator(".announcement");
  const track = page.locator(".announcement__track");
  // Pause is hover only; focus does not override the pointer leaving.
  await expect(announcement.locator("button")).toHaveCount(0);
  await page.mouse.move(900, 600);
  const initial = await track.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await expect
    .poll(() =>
      track.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(initial);
  await page.mouse.move(400, 20);
  await expect(track).toHaveCSS("animation-play-state", "paused");
  const frozen = await track.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.waitForTimeout(400);
  expect(
    await track.evaluate((element) => getComputedStyle(element).transform),
  ).toBe(frozen);
  await page.mouse.move(900, 600);
  await expect(track).toHaveCSS("animation-play-state", "running");
  await expect
    .poll(() =>
      track.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(frozen);
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
  await expect(page.locator(".announcement button")).toHaveCount(0);
});

test("Approved mobile home keeps the portrait without ASCII or announcement", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile composition check.");
  await page.goto("/");
  await expect(page.locator(".ascii-layer")).toBeHidden();
  await expect(page.locator("canvas.home-ascii")).toBeHidden();
  await expect(page.locator(".announcement")).toBeHidden();
});
