import { expect, test } from "@playwright/test";
import { releases } from "../../src/data/band";

for (const route of ["/", "/musica/", "/loja/", "/quem-somos/", "/presskit/"]) {
  test(`${route} renders without broken assets, runtime errors, or horizontal overflow`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("Main navigation works and the logo returns home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "NOSSA LOJA", exact: false }).click();
  await expect(page).toHaveURL(/\/loja\/$/);
  await expect(
    page.getByRole("link", { name: "NOSSA LOJA", exact: false }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("link", { name: "Lugar Nenhum, página inicial" })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test("CD carousel supports buttons, direct selection, arrows, and wraparound", async ({
  page,
}) => {
  await page.goto("/musica/");
  const active = page.locator('.disc[aria-pressed="true"]');
  const name = (index: number) => `Selecionar ${releases[index].title}`;
  await expect(active).toHaveAccessibleName(name(0));
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(active).toHaveAccessibleName(name(1));
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(active).toHaveAccessibleName(name(0));
  await page.getByRole("button", { name: name(1), exact: true }).click();
  await expect(active).toHaveAccessibleName(name(1));
  await active.focus();
  for (const index of [...releases.slice(2).map((_, index) => index + 2), 0]) {
    await page.keyboard.press("ArrowRight");
    await expect(active).toHaveAccessibleName(name(index));
  }
});

test("Skip link is keyboard accessible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("Home serves the correct art-directed photograph", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const source = await page
    .locator(".band-photo img")
    .evaluate((image: HTMLImageElement) => image.currentSrc);
  expect(source).toContain(
    testInfo.project.name === "mobile"
      ? "home-mobile.webp"
      : "home-desktop.webp",
  );
});
