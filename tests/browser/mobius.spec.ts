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
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  const held = await canvas.screenshot();
  await page.waitForTimeout(200);
  expect(await canvas.screenshot()).toEqual(held);
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 30,
    bounds.y + bounds.height / 2 - 20,
    { steps: 10 },
  );
  await page.mouse.up();
  const released = await canvas.screenshot();
  await page.waitForTimeout(300);
  expect((await canvas.screenshot()).equals(released)).toBe(false);
  await canvas.press("Escape");
  await page.waitForTimeout(100);
  const stopped = await canvas.screenshot();
  await page.waitForTimeout(200);
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
  await expect(page.getByRole("status")).toHaveText("Modelo 3D indisponível.");
  await page.getByRole("link", { name: /^(NOSSA )?LOJA$/ }).click();
  await expect(page).toHaveURL(/\/loja\/$/);
});
