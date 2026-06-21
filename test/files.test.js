import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildReportPaths, readPrompt, slugifyTopic, stripMarker } from "../src/files.js";
import { ensurePromptMarker } from "../src/chatgpt.js";
import { parseArgs } from "../src/cli.js";

describe("file helpers", () => {
  it("slugifies topics into filesystem-safe names", () => {
    assert.equal(slugifyTopic("Edge CDP / ChatGPT Research!"), "edge-cdp-chatgpt-research");
    assert.equal(slugifyTopic("  "), "chatgpt-web-research");
  });

  it("builds deterministic report paths", () => {
    const paths = buildReportPaths({
      outDir: "reports",
      topic: "Edge CDP",
      date: new Date("2026-06-21T10:00:00.000Z")
    });
    assert.match(paths.rawPath, /2026-06-21-edge-cdp-chatgpt-web-raw\.md$/);
    assert.match(paths.reportPath, /2026-06-21-edge-cdp\.md$/);
  });

  it("removes a marker from readable reports", () => {
    assert.equal(stripMarker("hello\n[[DONE]]\n", "[[DONE]]"), "hello");
  });

  it("gives an actionable message when a prompt file is missing", () => {
    assert.throws(
      () => readPrompt({ promptFile: "missing-prompt.md" }),
      /Copy-Item \.\\examples\\prompt\.zh\.md \.\\prompt\.md/
    );
  });
});

describe("prompt helpers", () => {
  it("appends a unique marker when missing", () => {
    const prompt = ensurePromptMarker("Research this.", "[[CHATGPT_WEB_RESEARCH_DONE_TEST]]");
    assert.match(prompt, /\[\[CHATGPT_WEB_RESEARCH_DONE_TEST\]\]/);
  });

  it("keeps appending the run-specific marker even if a generic marker is present", () => {
    const prompt = ensurePromptMarker("End with [[CHATGPT_WEB_RESEARCH_DONE]]", "[[CHATGPT_WEB_RESEARCH_DONE_TEST]]");
    assert.match(prompt, /\[\[CHATGPT_WEB_RESEARCH_DONE_TEST\]\]/);
  });
});

describe("cli parser", () => {
  it("parses flags, values, and no-flags", () => {
    assert.deepEqual(parseArgs(["--prompt-file", "a.md", "--topic=edge", "--no-launch", "extra"]), {
      _: ["extra"],
      promptFile: "a.md",
      topic: "edge",
      launch: false
    });
  });
});
