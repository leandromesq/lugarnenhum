import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { band, releases } from "../../src/data/band";

const counter = ".carousel-count";
const heading = ".release-details__copy h2";
const stage = ".disc-stage";
const preview = ".preview-button";
const announcement = ".announcement__link";
const countOf = (index: number) =>
  `${String(index + 1).padStart(2, "0")} / ${String(releases.length).padStart(2, "0")}`;

async function stageBox(page: Page) {
  const box = await page.locator(stage).boundingBox();
  if (!box) throw new Error("Disc stage is not laid out");
  return box;
}

test("Previous and next buttons move through the releases and wrap around", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  await expect(page.locator(heading)).toHaveText(releases[0].title);
  await expect(page.locator(counter)).toHaveText(countOf(0));
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(heading)).toHaveText(releases[1].title);
  await expect(page.locator(counter)).toHaveText(countOf(1));
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(page.locator(heading)).toHaveText(releases[0].title);
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(page.locator(heading)).toHaveText(
    releases[releases.length - 1].title,
  );
  await expect(page.locator(counter)).toHaveText(countOf(releases.length - 1));
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(counter)).toHaveText(countOf(0));
});

test("Arrow keys change the release from the carousel controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  await page.getByRole("button", { name: "Próximo lançamento" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(heading)).toHaveText(releases[1].title);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(heading)).toHaveText(releases[2].title);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(heading)).toHaveText(releases[1].title);
  await expect(page.locator(counter)).toHaveText(countOf(1));
});

test("A tracklist button selects its release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  await page.locator(".tracklist summary").click();
  await expect(page.locator(".tracklist")).toHaveAttribute("open", "");
  await expect(page.locator(".tracklist button")).toHaveCount(releases.length);
  const song = releases[4];
  await page
    .getByRole("button", { name: `Ir para ${song.title}`, exact: true })
    .click();
  await expect(page.locator(heading)).toHaveText(song.title);
  await expect(page.locator(counter)).toHaveText(countOf(4));
  await expect(
    page.getByRole("button", { name: `Ir para ${song.title}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".release-details__copy p")).toContainText(
    song.duration,
  );
});

test("The 3D stage becomes ready and its canvas covers the whole page", async ({
  page,
}) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  const boxes = await page.evaluate(() => {
    const proj = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    };
    const bar = document.querySelector(".announcement")!;
    return {
      main: proj(document.querySelector("main")!),
      canvas: proj(document.querySelector(".disc-canvas")!),
      // The canvas starts right below the announcement bar (hidden on mobile).
      bar: bar.getBoundingClientRect().height,
    };
  });
  expect(Math.abs(boxes.canvas.x - boxes.main.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(boxes.canvas.width - boxes.main.width)).toBeLessThanOrEqual(
    2,
  );
  expect(
    Math.abs(boxes.canvas.y - (boxes.main.y + boxes.bar)),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(
      boxes.canvas.y + boxes.canvas.height - (boxes.main.y + boxes.main.height),
    ),
  ).toBeLessThanOrEqual(2);
  await expect(page.locator(".disc-canvas")).toHaveCSS(
    "pointer-events",
    "none",
  );
});

test("Clicking the empty side or first stacked disc advances and the centre plays", async ({
  page,
}) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  const box = await stageBox(page);
  const centre = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(centre + box.width * 0.42, y);
  await expect(page.locator(counter)).toHaveText(countOf(1));
  const disc = await page.locator(".disc-fallback").boundingBox();
  await page.mouse.click(Math.max(2, centre - disc!.width), y);
  await expect(page.locator(counter)).toHaveText(countOf(2));
  await page.mouse.click(centre, y);
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "true");
});

test("The preview button plays and pauses the 15 second excerpt", async ({
  page,
}, testInfo) => {
  await page.goto("/musica/");
  const button = page.locator(preview);
  const audio = page.locator("audio");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toHaveText("▶ OUVIR PRÉVIA");
  await expect(page.locator(".preview-note")).toHaveText(
    "PRÉVIA DE 15S · GUIA NÃO FINALIZADA",
  );
  await expect(audio).toHaveAttribute(
    "src",
    new RegExp(`${releases[0].id}\\.mp3$`),
  );
  await button.click();
  await expect(button).toHaveText("❚❚ PAUSAR");
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
  await expect(button).toHaveAttribute("aria-pressed", "true");

  if (testInfo.project.name === "desktop") {
    await expect(page.locator(announcement)).toHaveAttribute(
      "aria-label",
      `TOCANDO AGORA - LUGAR NENHUM - ${releases[0].title.toUpperCase()}.WAV`,
    );
    await page.getByRole("button", { name: "Próximo lançamento" }).click();
    await expect(audio).toHaveAttribute(
      "src",
      new RegExp(`${releases[1].id}\\.mp3$`),
    );
    await expect(page.locator(announcement)).toHaveAttribute(
      "aria-label",
      `TOCANDO AGORA - LUGAR NENHUM - ${releases[1].title.toUpperCase()}.WAV`,
    );
    await expect
      .poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused))
      .toBe(false);
  }

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toHaveText("▶ OUVIR PRÉVIA");
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(true);
  if (testInfo.project.name === "desktop")
    await expect(page.locator(announcement)).toHaveAttribute(
      "aria-label",
      band.announcement,
    );
});

test("Reduced motion still allows continuous navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  for (const [index, release] of releases.entries()) {
    if (index)
      await page.getByRole("button", { name: "Próximo lançamento" }).click();
    await expect(page.locator(heading)).toHaveText(release.title);
    await expect(page.locator(counter)).toHaveText(countOf(index));
  }
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(counter)).toHaveText(countOf(0));
});
