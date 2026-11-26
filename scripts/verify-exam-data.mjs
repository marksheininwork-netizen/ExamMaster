import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const exams = {
  "ati-teas": 170, aws: 65, cna: 70, fnp: 150, "nclex-pn": 150,
  "nclex-rn": 150, "real-estate": 100, spi: 110,
};

function questionShape(html) {
  const marker = html.indexOf("questions:[");
  assert.notEqual(marker, -1, "exam page must define a question bank");
  let depth = 0, quote = "", escaped = false, memberCommas = 0;
  const members = [];
  for (let i = marker + "questions:".length; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[") {
      depth++;
      if (depth === 2) memberCommas = 0;
    } else if (ch === "," && depth === 2) {
      memberCommas++;
    } else if (ch === "]") {
      if (depth === 2) members.push(memberCommas + 1);
      depth--;
      if (depth === 0) break;
    }
  }
  return members;
}

let rationaleCount = 0, questionCount = 0;
for (const [slug, expected] of Object.entries(exams)) {
  const html = await readFile(new URL("../prepmaterials/" + slug + "/index.html", import.meta.url), "utf8");
  const members = questionShape(html);
  const configured = Number(html.match(/expected\s*:\s*(\d+)/)?.[1]);
  const minutes = Number(html.match(/minutes\s*:\s*(\d+)/)?.[1]);
  assert.equal(members.length, expected, slug + " question count");
  assert.equal(configured, expected, slug + " configured expected count");
  assert.ok(minutes > 0, slug + " timer configuration");
  assert.ok(members.every(n => n === 5 || n === 6), slug + " question tuples have four choices and optional rationale");
  const rationales = members.filter(n => n === 6).length;
  rationaleCount += rationales;
  questionCount += members.length;
  console.log(slug + ": " + members.length + " questions, " + minutes + " minutes, " + rationales + " authored rationales");
}
console.log("Total: " + questionCount + " questions; authored rationales: " + rationaleCount + "/" + questionCount);
if (rationaleCount < questionCount) console.warn("OPEN: missing authored rationales are surfaced in exam results and still require expert review.");