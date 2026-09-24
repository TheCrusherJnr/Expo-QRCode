// Lists the IDs you need for .env.local from your VSCO Workspace account.
// Usage: npm run vsco:setup   (reads VSCO_API_KEY from .env.local)

import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const key = process.env.VSCO_API_KEY;
const base = process.env.VSCO_API_BASE_URL || "https://workspace.vsco.co/api/v2";
if (!key) {
  console.error("Set VSCO_API_KEY in .env.local first.");
  process.exit(1);
}

async function list(path) {
  const res = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}pageSize=100`, {
    headers: { "X-API-KEY": key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return (await res.json()).items ?? [];
}

const sections = [
  ["Studio brands          -> VSCO_BRAND_ID", "/brand"],
  ["Job types              -> VSCO_JOB_TYPE_ID", "/job-type"],
  ["Lead sources           -> VSCO_LEAD_SOURCE_ID", "/lead-source"],
  ["Lead statuses          -> VSCO_LEAD_STATUS_ID", "/lead-status"],
  ["Event types            -> VSCO_WEDDING_EVENT_TYPE_ID", "/event-type"],
];

for (const [title, path] of sections) {
  console.log(`\n=== ${title}`);
  try {
    const items = await list(path);
    if (!items.length) console.log("  (none)");
    for (const i of items) {
      const extra = i.price !== undefined ? `  price=${i.price}` : "";
      console.log(`  ${i.id}  ${i.name ?? i.title ?? ""}${extra}${i.hidden ? "  [hidden]" : ""}`);
    }
  } catch (err) {
    console.log(`  error: ${err.message}`);
  }
}

console.log("\n=== Recent quotes        -> VSCO_TEMPLATE_QUOTE_IDS (options become the form's packages)");
try {
  const quotes = await list("/quote?sortBy=" + encodeURIComponent("created desc"));
  for (const q of quotes.slice(0, 15)) {
    const opts = (q.options ?? []).map((o) => `${o.name} $${Math.round((o.total ?? 0) / 100)}`).join(" | ");
    console.log(`  ${q.id}  ${q.name ?? "(untitled)"}  [${q.status}]\n      options: ${opts}`);
  }
} catch (err) {
  console.log(`  error: ${err.message}`);
}
