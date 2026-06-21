import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function slugifyTopic(topic = "chatgpt-web-research") {
  const slug = String(topic)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "chatgpt-web-research";
}

export function todayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function stripMarker(text, marker) {
  if (!marker) return text;
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== marker)
    .join("\n")
    .trimEnd();
}

export function readPrompt({ prompt, promptFile }) {
  if (prompt && promptFile) {
    throw new Error("Use either --prompt or --prompt-file, not both.");
  }
  if (promptFile) {
    return readFileSync(path.resolve(promptFile), "utf8");
  }
  if (prompt) {
    return prompt;
  }
  throw new Error("Missing prompt. Pass --prompt or --prompt-file.");
}

export function buildReportPaths({ outDir = "reports", topic, date = new Date() }) {
  const directory = path.resolve(outDir);
  const stamp = todayStamp(date);
  const slug = slugifyTopic(topic);
  return {
    directory,
    rawPath: path.join(directory, `${stamp}-${slug}-chatgpt-web-raw.md`),
    reportPath: path.join(directory, `${stamp}-${slug}.md`)
  };
}

export function saveReports({
  answer,
  marker,
  topic,
  outDir,
  chatUrl,
  extractionMethod,
  keepMarker = false,
  date = new Date()
}) {
  const paths = buildReportPaths({ outDir, topic, date });
  mkdirSync(paths.directory, { recursive: true });

  const savedAt = date.toISOString();
  const rawHeader = [
    "---",
    "source: ChatGPT web via Microsoft Edge CDP",
    `saved_at: ${savedAt}`,
    `chatgpt_url: ${chatUrl ?? "unknown"}`,
    `topic: ${topic ?? "chatgpt-web-research"}`,
    `extraction_method: ${extractionMethod}`,
    `verification: marker ${answer.includes(marker) ? "found" : "missing"}`,
    "---",
    ""
  ].join("\n");

  const readableText = keepMarker ? answer.trimEnd() : stripMarker(answer, marker);
  const reportHeader = [
    "---",
    "source: ChatGPT web via Microsoft Edge CDP",
    `saved_at: ${savedAt}`,
    `chatgpt_url: ${chatUrl ?? "unknown"}`,
    `topic: ${topic ?? "chatgpt-web-research"}`,
    `extraction_method: ${extractionMethod}`,
    "verification: marker found before saving",
    "---",
    ""
  ].join("\n");

  writeFileSync(paths.rawPath, `${rawHeader}${answer.trimEnd()}\n`, "utf8");
  writeFileSync(paths.reportPath, `${reportHeader}${readableText.trimEnd()}\n`, "utf8");
  return paths;
}
