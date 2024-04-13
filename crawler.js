import puppeteer from "puppeteer";

export class Browser {
  /**
   * @type {import('puppeteer').Browser}
   */
  #browser;

  constructor(browser) {
    this.#browser = browser;
  }

  static async startup() {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
      ],
    });
    return new Browser(browser);
  }

  async teardown() {
    await this.#browser.close();
  }

  /**
   * @return {Promise<string>}
   */
  async page(url) {
    let page = null;
    let content = null;

    try {
      page = await this.#browser.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('p[class^="comment"]');

      content = await page.content();
    } catch (e) {
      console.log(e.message);
    } finally {
      if (page) {
        await page.close();
      }
    }

    return content;
  }
}
