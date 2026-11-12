import { expect, test, type Page } from "@playwright/test";
import { releases } from "../../src/data/band";

/** Scrolls the page so below-the-fold lazy images start loading. */
async function scrollThroughLazyImages(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
}

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
    if (route === "/presskit/") await scrollThroughLazyImages(page);
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
  await page.getByRole("link", { name: /^(NOSSA )?LOJA$/ }).click();
  await expect(page).toHaveURL(/\/loja\/$/);
  await expect(
    page.getByRole("link", { name: /^(NOSSA )?LOJA$/ }),
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
  const heading = page.locator(".release-details__copy h2");
  await expect(heading).toHaveText(releases[0].title);
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(heading).toHaveText(releases[1].title);
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(heading).toHaveText(releases[0].title);
  await page.getByRole("button", { name: "Próximo lançamento" }).focus();
  for (const index of [...releases.slice(1).map((_, index) => index + 1), 0]) {
    await page.keyboard.press("ArrowRight");
    await expect(heading).toHaveText(releases[index].title);
  }
  await page.locator(".tracklist summary").click();
  await page
    .getByRole("button", { name: `Ir para ${releases[2].title}`, exact: true })
    .click();
  await expect(heading).toHaveText(releases[2].title);
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
