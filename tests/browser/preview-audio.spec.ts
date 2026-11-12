import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { band, releases } from "../../src/data/band";

const counter = ".carousel-count";
const heading = ".release-details__copy h2";
const preview = ".preview-button";
const announcement = ".announcement__link";

async function openMusic(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  await expect(page.locator(preview)).toBeVisible();
}

function audio(page: Page) {
  return page.locator("audio");
}

function roundedVolume(page: Page) {
  return audio(page).evaluate((element: HTMLAudioElement) =>
    Math.round(element.volume * 100),
  );
}

function isPaused(page: Page) {
  return audio(page).evaluate((element: HTMLAudioElement) => element.paused);
}

test("Volume still controls the sound when the browser ignores media.volume", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      configurable: true,
      get: () => 1,
      set: () => {},
    });
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this);
      const probe = this.createAnalyser();
      probe.fftSize = 256;
      gain.connect(probe);
      Object.assign(window, { volumeProbe: probe });
      return gain;
    };
  });
  const outputLevel = () =>
    page.evaluate(() => {
      const probe = (window as Window & { volumeProbe?: AnalyserNode })
        .volumeProbe;
      if (!probe) return 0;
      const samples = new Float32Array(probe.fftSize);
      probe.getFloatTimeDomainData(samples);
      return Math.sqrt(
        samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
      );
    });

  await openMusic(page);
  await page.locator(preview).click();
  await expect.poll(outputLevel).toBeGreaterThan(0.001);
  const slider = page.getByRole("slider", { name: "Volume" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect.poll(outputLevel).toBe(0);
  expect(await isPaused(page)).toBe(false);
  await page.keyboard.press("End");
  await expect.poll(outputLevel).toBeGreaterThan(0.001);
});

test("No preview autoplays on arrival and the volume starts at 25%", async ({
  page,
}) => {
  await openMusic(page);
  const slider = page.getByRole("slider", { name: "Volume" });
  await expect(slider).toHaveValue("25");
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(800);
  expect(await isPaused(page)).toBe(true);
  expect(await roundedVolume(page)).toBe(25);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    band.announcement,
  );
});

test("Volume arrow keys adjust the slider instead of the carousel", async ({
  page,
}) => {
  await openMusic(page);
  const slider = page.getByRole("slider", { name: "Volume" });
  await expect(page.locator(heading)).toHaveText(releases[0].title);

  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  await expect(slider).toHaveValue("28");
  await expect(page.locator(heading)).toHaveText(releases[0].title);
  await expect(page.locator(counter)).toHaveText(
    `01 / ${String(releases.length).padStart(2, "0")}`,
  );

  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("100");
});

test("Changing the slider changes the audible volume and can mute at zero", async ({
  page,
}) => {
  await openMusic(page);
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(true);
  await page.locator(preview).click();
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(false);
  await expect.poll(() => roundedVolume(page)).toBe(25);

  const slider = page.getByRole("slider", { name: "Volume" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await expect.poll(() => roundedVolume(page)).toBe(0);
  expect(await isPaused(page)).toBe(false);

  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await expect.poll(() => roundedVolume(page)).toBe(1);
});

test("Play fades the volume in instead of jumping to full level", async ({
  page,
}) => {
  await openMusic(page);
  const sampling = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const audio = document.querySelector("audio")!;
        const samples: number[] = [];
        const deadline = performance.now() + 10000;
        const tick = () => {
          samples.push(audio.volume);
          const quiet = samples.some((value) => value < 0.05);
          if ((quiet && audio.volume > 0.24) || performance.now() > deadline)
            resolve(samples);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

  await page.locator(preview).click();
  const samples = await sampling;
  expect(samples.some((value) => value > 0 && value < 0.24)).toBe(true);
  expect(samples[samples.length - 1]).toBeGreaterThan(0.24);
});

test("A track change keeps the old source, then starts the new one after the gap", async ({
  page,
}) => {
  await openMusic(page);
  await page.locator(preview).click();
  await expect.poll(() => roundedVolume(page)).toBe(25);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    `TOCANDO AGORA - LUGAR NENHUM - ${releases[0].title.toUpperCase()}.WAV`,
  );

  const started = Date.now();
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(heading)).toHaveText(releases[1].title);
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "true");

  await page.waitForTimeout(150);
  expect(await audio(page).getAttribute("src")).toContain(releases[0].id);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    band.announcement,
  );

  await expect(audio(page)).toHaveAttribute(
    "src",
    new RegExp(`${releases[1].id}\\.mp3$`),
    { timeout: 4000 },
  );
  expect(Date.now() - started).toBeGreaterThanOrEqual(750);
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(false);
  await expect.poll(() => roundedVolume(page)).toBe(25);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    `TOCANDO AGORA - LUGAR NENHUM - ${releases[1].title.toUpperCase()}.WAV`,
  );
});

test("Browsing while paused never starts a preview", async ({ page }) => {
  await openMusic(page);
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(heading)).toHaveText(releases[2].title);

  await page.waitForTimeout(1200);
  expect(await isPaused(page)).toBe(true);
  expect(await audio(page).getAttribute("src")).toContain(releases[0].id);
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "false");

  await page.locator(preview).click();
  await expect(audio(page)).toHaveAttribute(
    "src",
    new RegExp(`${releases[2].id}\\.mp3$`),
  );
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(false);
});

test("Pausing during the swap gap cancels the delayed preview", async ({
  page,
}) => {
  await openMusic(page);
  await page.locator(preview).click();
  await expect.poll(() => roundedVolume(page)).toBe(25);

  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await page.waitForTimeout(120);
  await page.locator(preview).click();
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "false");

  await page.waitForTimeout(1300);
  expect(await isPaused(page)).toBe(true);
  expect(await audio(page).getAttribute("src")).toContain(releases[0].id);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    band.announcement,
  );

  await page.locator(preview).click();
  await expect(audio(page)).toHaveAttribute(
    "src",
    new RegExp(`${releases[1].id}\\.mp3$`),
  );
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(false);
});

test("A failed preview can be retried without a stale failure", async ({
  page,
}) => {
  await page.route("**/*.mp3", (route) => route.abort());
  await openMusic(page);
  await page.locator(preview).click();
  await expect(page.locator(".preview-note")).toHaveText(
    "Prévia indisponível.",
  );
  await expect(page.locator(preview)).toHaveAttribute("aria-pressed", "false");

  await page.unroute("**/*.mp3");
  await page.locator(preview).click();
  await expect(page.locator(".preview-note")).toHaveText(
    "PRÉVIA DE 15S · GUIA NÃO FINALIZADA",
  );
  await expect
    .poll(() =>
      audio(page).evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(false);
  await expect.poll(() => roundedVolume(page)).toBe(25);
});

test("Leaving the page clears the now-playing announcement", async ({
  page,
}) => {
  await openMusic(page);
  await page.locator(preview).click();
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    `TOCANDO AGORA - LUGAR NENHUM - ${releases[0].title.toUpperCase()}.WAV`,
  );

  await page
    .getByRole("link", { name: "Lugar Nenhum, página inicial" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(announcement)).toHaveAttribute(
    "aria-label",
    band.announcement,
  );
});
