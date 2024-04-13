import bunyan from "bunyan";
import htmlParser from "node-html-parser";

import * as crawler from "./crawler.js";

const logger = bunyan.createLogger({ name: "alice_stats", level: "debug" });
const browser = await crawler.Browser.startup();

const baseURL =
  "https://www.yelp.com/user_details_reviews_self?userid=b8ag7AQ9sUy_jzGrxgWOyg";
let offset = 0;

let allReviewText = [];
let hasNext = false;
do {
  const url = baseURL + `&start=${offset}`;
  let page = await browser.page(url);

  logger.debug({ url, page: typeof page }, "got url");

  const document = htmlParser.parse(page);
  const reviews = document.querySelectorAll('p[class^="comment"]');
  const reviewText = reviews.map((n) => n.textContent);

  allReviewText = allReviewText.concat(reviewText);

  hasNext = Boolean(document.querySelector("a.next-link"));
  offset += 10;
} while (hasNext);

logger.debug("got all reviews, tearing down");

await browser.teardown();

console.log(
  JSON.stringify({
    "total reviews": allReviewText.length,
    'avg "salty" per review': Number(
      (
        allReviewText.reduce((count, r) => {
          const salty = Array.from(r.matchAll(/salty/gi)).length;

          return count + salty;
        }, 0) / allReviewText.length
      ).toFixed(2),
    ),
    "too salty": allReviewText.reduce((count, r) => {
      const tooSalty = Array.from(r.matchAll(/too salty/gi)).length;
      const notTooSalty = Array.from(r.matchAll(/not too salty/gi)).length;

      return count + (tooSalty - notTooSalty);
    }, 0),
    "not too salty": allReviewText.reduce((count, r) => {
      const notTooSalty = Array.from(r.matchAll(/not too salty/gi)).length;

      return count + notTooSalty;
    }, 0),
    '20 most common two-word phrases preceding "salty"': Object.fromEntries(
      Object.entries(
        allReviewText
          .flatMap((r) => {
            const matches = r.matchAll(
              /(?<first>[a-zA-Z']+) (?<second>[a-zA-Z']+) salty/g,
            );

            const phrases = [];
            for (const m of matches) {
              const phrase = `${m[1].toLowerCase()} ${m[2].toLowerCase()}`;
              phrases.push(phrase);
            }

            return phrases;
          })
          .reduce((acc, p) => {
            if (acc[p]) {
              acc[p] += 1;
            } else {
              acc[p] = 1;
            }

            return acc;
          }, {}),
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20),
    ),
  }),
);
