#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const README = path.join(process.cwd(), "README.md");
const UA = "Lotus015-readme-refresh/1.0";

async function fetchBaroVersion() {
  try {
    const r = await fetch("https://registry.npmjs.org/baro-ai/latest");
    if (!r.ok) return null;
    const j = await r.json();
    return j.version || null;
  } catch (e) {
    console.warn("baro version fetch failed:", e.message);
    return null;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchLatestPost() {
  try {
    const indexRes = await fetch("https://jigjoy.ai/blog", {
      headers: { "user-agent": UA },
    });
    if (!indexRes.ok) return null;
    const indexHtml = await indexRes.text();

    const slugRe = /\/blog\/([a-z0-9][a-z0-9-]*)\/thumbnail-og\.[a-z0-9]+/gi;
    const slugs = [];
    const seen = new Set();
    let m;
    while ((m = slugRe.exec(indexHtml)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        slugs.push(m[1]);
      }
    }
    if (!slugs.length) {
      console.warn("no blog slugs found on index page");
      return null;
    }
    const latestSlug = slugs[0];
    const url = `https://jigjoy.ai/blog/${latestSlug}/`;

    const postRes = await fetch(url, { headers: { "user-agent": UA } });
    if (!postRes.ok) {
      console.warn("post page fetch failed:", postRes.status);
      return null;
    }
    const postHtml = await postRes.text();

    let title = null;
    const ogTitle = postHtml.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    if (ogTitle) title = ogTitle[1];

    if (!title) {
      const titleTag = postHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleTag) title = titleTag[1];
    }

    if (!title) return null;

    title = decodeEntities(title).replace(/\s+/g, " ").trim();
    title = title.replace(/\s*[|·–—-]\s*JigJoy.*$/i, "").trim();

    return { title, url };
  } catch (e) {
    console.warn("blog fetch failed:", e.message);
    return null;
  }
}

function replaceMarker(src, name, replacement) {
  const re = new RegExp(
    `<!-- ${name}:START -->[\\s\\S]*?<!-- ${name}:END -->`,
    "m"
  );
  if (!re.test(src)) {
    console.warn(`marker ${name} not found`);
    return src;
  }
  return src.replace(
    re,
    `<!-- ${name}:START -->\n${replacement}\n<!-- ${name}:END -->`
  );
}

async function main() {
  const [version, post] = await Promise.all([
    fetchBaroVersion(),
    fetchLatestPost(),
  ]);

  let readme = await fs.readFile(README, "utf8");
  const before = readme;

  if (version) {
    readme = replaceMarker(
      readme,
      "BARO_VERSION",
      `Currently shipping **v${version}**`
    );
    console.log(`baro version: v${version}`);
  } else {
    console.log("baro version: kept existing");
  }

  if (post) {
    readme = replaceMarker(
      readme,
      "BLOG",
      `**Latest essay** → [${post.title}](${post.url})`
    );
    console.log(`blog: ${post.title}`);
  } else {
    console.log("blog: kept existing");
  }

  if (readme === before) {
    console.log("no changes");
    return;
  }

  await fs.writeFile(README, readme);
  console.log("README updated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
