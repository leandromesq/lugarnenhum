import { expect, test } from "@playwright/test";
import { releases } from "../../src/data/band";

const active = '.disc[aria-pressed="true"]';

test("Tracklist selects a distant song directly without a serial animation queue", async ({
  page,
}) => {
  await page.goto("/musica/");
  await page.locator(".tracklist summary").click();
  await expect(page.locator(".tracklist")).toHaveAttribute("open", "");
  await expect(page.locator(".tracklist button")).toHaveCount(6);
  const song = releases[4];
  await page
    .getByRole("button", { name: `Ir para ${song.title}`, exact: true })
    .click();
  await expect(page.locator(active)).toHaveAccessibleName(
    `Selecionar ${song.title}`,
  );
  await expect(page.locator(".disc-track")).toHaveAttribute(
    "data-moving",
    "false",
  );
  await expect(page.locator(".disc-track")).toHaveAttribute(
    "data-rebasing",
    "false",
  );
  await expect(
    page.getByRole("button", { name: `Ir para ${song.title}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".release-details__copy p")).toContainText(
    song.duration,
  );
});

test("Carousel has soft edges, inclined side discs and a metadata fade", async ({
  page,
}) => {
  await page.goto("/musica/");
  const styles = await page.evaluate(() => {
    const stage = document.querySelector(".disc-stage")!;
    const selected = document.querySelector('.disc[aria-pressed="true"]')!;
    const next = document.querySelector(
      '.disc[data-side="right"][data-visible="true"]',
    )!;
    return {
      mask: getComputedStyle(stage).maskImage,
      selected: getComputedStyle(selected).transform,
      side: getComputedStyle(next).transform,
      duration: getComputedStyle(document.querySelector(".disc-track")!)
        .transitionDuration,
      metadata: getComputedStyle(
        document.querySelector(".release-details__transition")!,
      ).animationName,
    };
  });
  expect(styles.mask).toContain("linear-gradient");
  expect(styles.side).toContain("matrix3d");
  expect(styles.selected).not.toBe(styles.side);
  expect(styles.metadata).toBe("release-copy-in");
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(".disc-track")).toHaveCSS(
    "transition-duration",
    "0.45s",
  );
});

test("Secondary links contain only the confirmed Instagram and presskit", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Links secundários" });
  await expect(
    footer.getByRole("link", { name: "INSTAGRAM", exact: false }),
  ).toHaveAttribute("href", "https://www.instagram.com/lugarnenhum.wav/");
  await expect(
    footer.getByRole("link", { name: "PRESSKIT", exact: true }),
  ).toHaveAttribute("href", "/presskit/");
  const bounds = await footer.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThan(viewport.width / 2);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator(".site-shell--home .site-footer")).toHaveCSS(
    "background-color",
    "rgba(8, 9, 9, 0.82)",
  );
  await footer.getByRole("link", { name: "PRESSKIT", exact: true }).click();
  await expect(page).toHaveURL(/\/presskit\/$/);
  await expect(
    page.getByRole("link", { name: "PRESSKIT", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("Mobile has readable short navigation and the white biography gradient from Pencil", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile art direction.");
  await page.goto("/quem-somos/");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav).toBeVisible();
  for (const text of ["MÚSICA", "LOJA", "SOBRE"])
    await expect(nav.getByText(text, { exact: true })).toBeVisible();
  const before = await nav.boundingBox();
  expect(before!.y + before!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  const style = await page.evaluate(() => {
    const bio = getComputedStyle(document.querySelector(".biography")!);
    const copy = getComputedStyle(document.querySelector(".about-copy")!);
    const nav = getComputedStyle(document.querySelector(".site-navigation")!);
    return {
      colour: bio.color,
      font: bio.fontSize,
      align: bio.textAlign,
      shadow: bio.textShadow,
      gradient: copy.backgroundImage,
      navPosition: nav.position,
      navFont: nav.fontSize,
    };
  });
  expect(style.colour).toBe("rgb(245, 245, 245)");
  expect(style.font).toBe("14px");
  expect(style.align).toBe("left");
  expect(style.shadow).toBe("none");
  expect(style.gradient).toContain("linear-gradient");
  expect(style.gradient).toContain("rgb(171, 198, 238)");
  expect(style.gradient).toContain("rgb(115, 144, 212)");
  expect(
    parseFloat(style.gradient.match(/rgb\(171, 198, 238\) ([\d.]+)%/)![1]),
  ).toBeCloseTo(25.480768, 3);
  expect(
    parseFloat(style.gradient.match(/rgb\(115, 144, 212\) ([\d.]+)%/)![1]),
  ).toBeCloseTo(83.653843, 3);
  expect(style.navPosition).toBe("fixed");
  expect(parseFloat(style.navFont)).toBeGreaterThanOrEqual(12);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(nav).toBeVisible();
  expect(await nav.boundingBox()).toEqual(before);
});

test("Desktop biography keeps the composition without a text shadow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop biography.");
  await page.goto("/quem-somos/");
  await expect(page.locator(".biography--left")).toHaveCSS(
    "text-shadow",
    "none",
  );
  const ratio = await page.locator(".biography--left").evaluate((element) => {
    const style = getComputedStyle(element);
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
  });
  expect(ratio).toBeCloseTo(1.4, 1);
});

test("Official brand assets use dedicated black and white files without shop inversion", async ({
  page,
}) => {
  await page.goto("/loja/");
  await expect(page.locator(".shop-symbol")).toHaveAttribute(
    "src",
    /\/symbol-dark\.webp$/,
  );
  await expect(page.locator(".brand__wordmark img")).toHaveAttribute(
    "src",
    /\/wordmark-dark\.webp$/,
  );
  expect(
    await page
      .locator(".brand__wordmark")
      .evaluate((element) => getComputedStyle(element).filter),
  ).toBe("none");
  await page.goto("/");
  await expect(page.locator(".brand__symbol")).toHaveAttribute(
    "src",
    /\/symbol\.webp$/,
  );
  await expect(page.locator(".brand__wordmark img")).toHaveAttribute(
    "src",
    /\/wordmark\.webp$/,
  );
});

test("The six Pencil finishes retain their ordered colours, logo and song labels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  const colours = [
    "#a6cced",
    "#4bd268",
    "#cdcbcb",
    "#c5da5f",
    "#83c0aa",
    "#ff94df",
  ];
  for (let index = 0; index < releases.length; index++) {
    const disc = page.locator('.disc[aria-pressed="true"]');
    await expect(disc).toHaveClass(new RegExp(`disc--edition-${index}`));
    await expect(disc.locator(".disc__title")).toHaveText(
      releases[index].title,
    );
    await expect(disc.locator(".disc__format")).toHaveText(
      releases[index].duration,
    );
    const style = await disc.evaluate((element) => ({
      colour: getComputedStyle(element)
        .getPropertyValue("--disc-light-a")
        .trim(),
      coating: getComputedStyle(element, "::before").mixBlendMode,
      hub: getComputedStyle(element.querySelector(".disc__hub")!)
        .backgroundImage,
    }));
    expect(style.colour).toBe(colours[index]);
    expect(style.coating).toBe("hue");
    expect(style.hub).toContain("linear-gradient");
    await expect(disc.locator(".disc__title")).toHaveCSS(
      "font-style",
      "italic",
    );
    await expect(disc.locator(".disc__title")).toHaveCSS("font-weight", "500");
    await expect
      .poll(() =>
        disc
          .locator(".disc__wordmark img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Próximo lançamento" }).click();
  }
});
