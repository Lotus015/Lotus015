#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const README = path.join(ROOT, "README.md");
const UA = "Lotus015-readme-refresh/1.0";

const PINNED = [
  {
    owner: "Lotus015",
    repo: "baro",
    description:
      "CLI · parallel Claude Code agents as a DAG · opens a PR when done",
    showOwner: false,
    file: "assets/baro-pin.svg",
  },
  {
    owner: "jigjoy-ai",
    repo: "mozaik",
    description: "TS runtime · reactive agents on a shared event bus",
    showOwner: true,
    file: "assets/mozaik-pin.svg",
  },
];

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
    if (!slugs.length) return null;
    const latestSlug = slugs[0];
    const url = `https://jigjoy.ai/blog/${latestSlug}/`;

    const postRes = await fetch(url, { headers: { "user-agent": UA } });
    if (!postRes.ok) return null;
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

async function fetchRepoStats(owner, repo) {
  try {
    const headers = {
      "user-agent": UA,
      accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });
    if (!r.ok) {
      console.warn(`repo ${owner}/${repo} fetch failed:`, r.status);
      return null;
    }
    const j = await r.json();
    return {
      stars: j.stargazers_count ?? 0,
      forks: j.forks_count ?? 0,
      language: j.language || "TypeScript",
    };
  } catch (e) {
    console.warn(`repo ${owner}/${repo} fetch failed:`, e.message);
    return null;
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const LANG_COLORS = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
  Rust: "#DEA584",
  Go: "#00ADD8",
  Shell: "#89E051",
};

function wrapDescription(s, maxChars = 56) {
  const words = s.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function buildPinCard({ owner, repo, description, showOwner, stats }) {
  const title = showOwner ? `${owner}/${repo}` : repo;
  const lines = wrapDescription(description);
  const lang = stats.language;
  const langC = LANG_COLORS[lang] || "#78AAF6";
  const stars = formatCount(stats.stars);
  const forks = formatCount(stats.forks);

  const fontSans =
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const descTspans = lines
    .map(
      (l, i) =>
        `  <text x="24" y="${
          74 + i * 20
        }" font-family="${fontSans}" font-size="13" fill="#FFFFFF" fill-opacity="0.72">${escapeXml(
          l
        )}</text>`
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 140" width="420" height="140" role="img" aria-label="${escapeXml(
    title
  )}">
  <rect width="420" height="140" fill="#000000" rx="10"/>
  <rect x="0.5" y="0.5" width="419" height="139" fill="none" stroke="#78AAF6" stroke-opacity="0.22" stroke-width="1" rx="10"/>

  <g transform="translate(20, 26)" fill="none" stroke="#78AAF6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 1.5 h11 a2 2 0 0 1 2 2 v11 a1.5 1.5 0 0 1 -1.5 1.5 h-10 a1.5 1.5 0 0 1 -1.5 -1.5 v-11.5 a2 2 0 0 1 2 -2 z"/>
    <path d="M4 12 h9"/>
  </g>

  <text x="44" y="38" font-family="${fontSans}" font-size="16" font-weight="700" fill="#78AAF6">${escapeXml(
    title
  )}</text>

${descTspans}

  <circle cx="30" cy="117" r="5" fill="${langC}"/>
  <text x="42" y="121" font-family="${fontSans}" font-size="12" fill="#FFFFFF" fill-opacity="0.7">${escapeXml(
    lang
  )}</text>

  <path d="M170 113 l1.7 3.7 4 0.5 -2.9 2.9 0.7 4 -3.5 -1.9 -3.5 1.9 0.7 -4 -2.9 -2.9 4 -0.5 z" fill="#90E86F"/>
  <text x="184" y="121" font-family="${fontSans}" font-size="12" fill="#FFFFFF" fill-opacity="0.7">${stars}</text>

  <g transform="translate(228, 109)" fill="#90E86F" stroke="#90E86F" stroke-width="1.4" stroke-linecap="round">
    <circle cx="0" cy="0" r="2"/>
    <circle cx="10" cy="0" r="2"/>
    <circle cx="5" cy="11" r="2"/>
    <path d="M0 2 v2 a3 3 0 0 0 3 3 h4 a3 3 0 0 0 3 -3 v-2" fill="none"/>
    <line x1="5" y1="2" x2="5" y2="9" />
  </g>
  <text x="246" y="121" font-family="${fontSans}" font-size="12" fill="#FFFFFF" fill-opacity="0.7">${forks}</text>
</svg>
`;
}

async function writePinCards() {
  for (const p of PINNED) {
    const stats = await fetchRepoStats(p.owner, p.repo);
    if (!stats) {
      console.log(`pin ${p.repo}: skipped (fetch failed)`);
      continue;
    }
    const svg = buildPinCard({ ...p, stats });
    const full = path.join(ROOT, p.file);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, svg);
    console.log(
      `pin ${p.repo}: ${stats.language} · ★ ${stats.stars} · ⑂ ${stats.forks}`
    );
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

  await writePinCards();

  let readme = await fs.readFile(README, "utf8");
  const before = readme;

  if (version) {
    readme = replaceMarker(
      readme,
      "BARO_VERSION",
      `Currently shipping **v${version}**`
    );
    console.log(`baro version: v${version}`);
  }

  if (post) {
    readme = replaceMarker(
      readme,
      "BLOG",
      `**Latest essay** → [${post.title}](${post.url})`
    );
    console.log(`blog: ${post.title}`);
  }

  if (readme !== before) {
    await fs.writeFile(README, readme);
    console.log("README updated");
  } else {
    console.log("README unchanged");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
