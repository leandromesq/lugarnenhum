import { expect, test } from "@playwright/test";
import { band } from "../../src/data/band";

test("Music keeps its closed tracklist and metadata above navigation on short screens", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [320, 568],
    [390, 667],
    [390, 844],
    [1366, 768],
    [1440, 900],
    [1280, 600],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/musica/");
    await page.evaluate(() => document.fonts.ready);
    const summary = page.locator(".tracklist summary");
    const bounds = (await summary.boundingBox())!;
    const nav = (await page.locator(".site-navigation").boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThan(
      width < 768 ? nav.y - 16 : height - 44,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await summary.click();
    const last = page.locator(".tracklist button").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    const lastBounds = (await last.boundingBox())!;
    if (width < 768)
      expect(lastBounds.y + lastBounds.height).toBeLessThan(nav.y);
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");
  }
});

test("Desktop navigation labels stay on one line without shrinking type", async ({
  page,
}) => {
  for (const width of [768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/musica/");
    await page.evaluate(() => document.fonts.ready);
    const measurements = await page
      .locator(".site-navigation a")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const label = element.querySelector(".site-navigation__label--full")!;
          const range = document.createRange();
          range.selectNodeContents(label);
          return {
            lines: range.getClientRects().length,
            font: parseFloat(getComputedStyle(element).fontSize),
            right: element.getBoundingClientRect().right,
          };
        }),
      );
    for (const measurement of measurements) {
      expect(measurement.lines).toBe(1);
      expect(measurement.font).toBeGreaterThanOrEqual(14);
      expect(measurement.right).toBeLessThanOrEqual(width);
    }
  }
});

test("Biography occurs once in two semantic columns, both visible on mobile", async ({
  page,
}) => {
  await page.goto("/quem-somos/");
  const paragraphs = page.locator(".about-copy p");
  await expect(paragraphs).toHaveCount(band.biography.length);
  const texts = await paragraphs.allTextContents();
  expect(texts).toEqual([...band.biography]);
  await expect(page.locator(".biography--right")).toBeVisible();
  expect(
    await page.locator(".biography--right").getAttribute("aria-hidden"),
  ).toBeNull();
  for (const paragraph of await paragraphs.all())
    await expect(paragraph).toBeVisible();
});

test("Fidget offers a temporary nonblocking hint and dismisses it on manipulation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".mobius")).toHaveAttribute("data-state", "ready", {
    timeout: 30000,
  });
  const hint = page.locator(".mobius__hint");
  await expect(hint).toHaveText("Arraste para girar");
  await expect(hint).toHaveCSS("pointer-events", "none");
  await page.clock.fastForward(5100);
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".mobius")).toHaveAttribute("data-state", "ready", {
    timeout: 30000,
  });
  await expect(hint).toBeVisible();
  await page.locator(".mobius canvas").click();
  await expect(hint).toHaveCount(0);
});
