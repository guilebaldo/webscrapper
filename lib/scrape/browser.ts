import type { Browser } from "puppeteer-core";

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");
  const chromium = await import("@sparticuz/chromium");

  const executablePath = await chromium.default.executablePath();

  return puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath,
    headless: true,
  });
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export async function renderPageHtml(
  url: string,
  timeoutMs: number,
  userAgent: string,
): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(userAgent);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });
    // Give late client renders a short breath
    await new Promise((r) => setTimeout(r, 800));
    return await page.content();
  } finally {
    await page.close().catch(() => undefined);
  }
}
