import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";

const baseUrl = process.argv[2] || "https://ncode.syosetu.com/n2710db/";

const headers = {
  "User-Agent": "Mozilla/5.0"
};

const novelInfo = {
  title: "",
  author: "",
  description: "",
  chapters: []
};

const limit = pLimit(10);

async function fetchPage(url, allow404 = false) {
  try {
    const response = await axios.get(url, {
      headers,
      timeout: 15000
    });

    return cheerio.load(response.data);

  } catch (err) {

    if (allow404 && err.response?.status === 404) {
      return null;
    }

    throw err;
  }
}

function extractChapterLinks($) {
  const links = [];

  const eplist = $(".p-eplist");

  if (!eplist.length) {
    return links;
  }

  let currentSection = "その他";

  eplist.find(".p-eplist__chapter-title, .p-eplist__sublist")
    .each((_, elem) => {

      const el = $(elem);

      if (el.hasClass("p-eplist__chapter-title")) {
        currentSection = el.text().trim();
        return;
      }

      if (el.hasClass("p-eplist__sublist")) {

        const link = el.find("a");

        const href = link.attr("href");

        if (!href) return;

        links.push({
          title: link.text().trim(),
          section: currentSection,
          url: new URL(href, baseUrl).href
        });
      }
    });

  return links;
}

async function extractChapterContent(chapterUrl) {

  const $ = await fetchPage(chapterUrl);

  const chapterTitle =
    $("h1.p-novel__title").text().trim();

  let chapterHtml = "";
  let chapterText = "";

  $(".js-novel-text").each((_, elem) => {

    const el = $(elem);

    if (el.hasClass("p-novel__text--preface")) {
      return;
    }

    chapterHtml = el.html() || "";
    chapterText = el.text().trim();

    return false;
  });

  return {
    chapterTitle,
    chapterHtml,
    chapterText
  };
}

async function fetchChapterWorker(idx, chapter) {

  try {

    console.error(`📥 Fetching chapter ${idx}`);

    const data = await extractChapterContent(chapter.url);

    return {
      id: idx,
      title: data.chapterTitle || chapter.title,
      section: chapter.section,
      content: data.chapterHtml,
      content_text: data.chapterText
    };

  } catch (err) {

    console.error(`❌ Failed chapter ${idx}`, err.message);

    return {
      id: idx,
      title: chapter.title,
      section: chapter.section,
      content: "",
      content_text: ""
    };
  }
}

async function main() {

  let pageNumber = 1;

  const chapters = [];
  const seen = new Set();

  while (true) {

    const pageUrl =
      pageNumber === 1
        ? baseUrl
        : `${baseUrl}?p=${pageNumber}`;

    console.error(`📖 Fetching ${pageUrl}`);

    const $ = await fetchPage(
      pageUrl,
      pageNumber > 1
    );

    if (!$) {
      break;
    }

    if (pageNumber === 1) {

      novelInfo.title =
        $(".p-novel__title").first().text().trim();

      novelInfo.author =
        $(".p-novel__author").first().text().trim();

      novelInfo.description =
        $("#novel_ex").text().trim();

      console.error("Title:", novelInfo.title);
    }

    const pageLinks = extractChapterLinks($);

    const newLinks = pageLinks.filter(ch => {

      if (seen.has(ch.url)) {
        return false;
      }

      seen.add(ch.url);

      return true;
    });

    if (!newLinks.length) {
      break;
    }

    chapters.push(...newLinks);

    console.error(
      `Found ${newLinks.length} new chapters`
    );

    pageNumber++;

    await new Promise(r => setTimeout(r, 500));
  }

  console.error(`✅ Found ${chapters.length} chapters`);

  const tasks = chapters.map((chapter, idx) =>
    limit(() =>
      fetchChapterWorker(idx + 1, chapter)
    )
  );

  const results = await Promise.all(tasks);

  novelInfo.chapters = results;

  const filename =
    `${novelInfo.title.replace(/[<>:"/\\\\|?*]/g, "-")}.json`;

  fs.writeFileSync(
    filename,
    JSON.stringify(novelInfo, null, 2),
    "utf-8"
  );

  console.error(`✅ Saved to ${filename}`);
}

main().catch(err => {
  console.error(err);
});
