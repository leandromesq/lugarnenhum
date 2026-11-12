import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({ timezoneId: "America/Sao_Paulo" });

for (const [hour, period] of [
  [8, "morning"],
  [12, "day"],
  [17, "sunset"],
  [22, "night"],
] as const) {
  test(`The local ${period} sky is visible and only its assets load`, async ({
    page,
  }) => {
    await page.clock.install({
      time: new Date(`2026-11-12T${String(hour).padStart(2, "0")}:00:00-03:00`),
    });
    const skies: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/assets/sky/")) skies.push(request.url());
    });
    await page.goto("/musica/");
    const stage = page.locator(".disc-stage");
    await expect(stage).toHaveAttribute("data-sky-period", period);
    await expect(stage).toHaveAttribute("data-state", "ready", {
      timeout: 15000,
    });
    expect(skies).toHaveLength(2);
    expect(skies.filter((url) => url.endsWith(".hdr"))).toHaveLength(1);
    expect(skies.filter((url) => url.endsWith(".webp"))).toHaveLength(1);
    expect(skies.every((url) => url.includes(`/${period}-sky-`))).toBe(true);

    // Sample empty sky at the right edge, away from the CDs and navigation.
    const canvas = page.locator(".disc-canvas");
    const size = await canvas.boundingBox();
    expect(size).not.toBeNull();
    const screenshot = await canvas.screenshot({ scale: "css" });
    const { data } = await sharp(screenshot)
      .extract({
        left: Math.floor(size!.width * 0.98),
        top: Math.floor(size!.height * 0.5),
        width: 1,
        height: 1,
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(Math.max(...data)).toBeGreaterThan(20);
  });
}

test("The sky drifts sideways without redrawing the discs, and rests with reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counter = window as unknown as { discDraws: number };
    counter.discDraws = 0;
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      counter.discDraws++;
      return draw.apply(this, args);
    };
  });
  await page.goto("/musica/");
  await expect(page.locator(".disc-stage")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 15000 },
  );
  const drift = page.locator(".disc-sky__drift");
  const offset = () =>
    drift.evaluate((element) => element.getBoundingClientRect().left);
  const draws = () =>
    page.evaluate(() => (window as unknown as { discDraws: number }).discDraws);
  await page.waitForTimeout(1500);
  const settledDraws = await draws();
  // Jump ahead instead of waiting minutes for the slow drift.
  await drift.evaluate((element) => {
    element.getAnimations()[0].currentTime = 150_000;
  });
  expect(await offset()).toBeLessThan(-100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
  await page.waitForTimeout(500);
  expect(await draws()).toBe(settledDraws);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await drift.evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  expect(await offset()).toBe(0);
});
