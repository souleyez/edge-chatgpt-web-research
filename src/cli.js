#!/usr/bin/env node
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { createMarker, connectToEdge, ensurePromptMarker, getChatGptPage, submitPrompt, waitForMarker } from "./chatgpt.js";
import { defaultPort, defaultProfileDir, findEdgeExecutable, launchEdge, probeCdp, waitForCdp } from "./edge.js";
import { readPrompt, saveReports } from "./files.js";

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }
    if (arg.startsWith("--no-")) {
      result[arg.slice(5)] = false;
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      result[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

function help() {
  return `edge-chatgpt-web-research

Commands:
  doctor                         Check Edge executable and CDP endpoint
  launch                         Launch dedicated Edge profile at ChatGPT
  run --prompt-file prompt.md     Submit prompt, wait for marker, save reports

Options:
  --port 9223
  --profile <dir>
  --edge <path-to-msedge.exe>
  --out-dir reports
  --topic <topic>
  --timeout-minutes 45
  --poll-ms 5000
  --no-launch
  --keep-marker
`;
}

function numberOption(value, fallback) {
  if (value === undefined || value === true || value === false) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

async function doctor(options) {
  const port = numberOption(options.port, defaultPort());
  const profileDir = options.profile || defaultProfileDir();
  let edge;
  try {
    edge = findEdgeExecutable(options.edge);
  } catch (error) {
    edge = String(error?.message ?? error);
  }
  const cdp = await probeCdp(port);
  console.log(
    JSON.stringify(
      {
        edge,
        profileDir,
        profileExists: existsSync(profileDir),
        port,
        cdp
      },
      null,
      2
    )
  );
}

async function launch(options) {
  const port = numberOption(options.port, defaultPort());
  const profileDir = options.profile || defaultProfileDir();
  const result = await launchEdge({
    edgePath: options.edge,
    profileDir,
    port,
    url: options.url || "https://chatgpt.com/"
  });
  console.log(JSON.stringify(result, null, 2));
}

async function run(options) {
  const port = numberOption(options.port, defaultPort());
  const profileDir = options.profile || defaultProfileDir();
  const timeoutMinutes = numberOption(options.timeoutMinutes, 45);
  const pollMs = numberOption(options.pollMs, 5000);
  const marker = createMarker();
  const prompt = ensurePromptMarker(readPrompt({ prompt: options.prompt, promptFile: options.promptFile }), marker);

  let cdp = await probeCdp(port);
  if (!cdp.ok && options.launch !== false) {
    const launchResult = await launchEdge({
      edgePath: options.edge,
      profileDir,
      port,
      url: "https://chatgpt.com/"
    });
    cdp = launchResult.cdp;
  }
  if (!cdp.ok) {
    cdp = await waitForCdp(port, 5000);
  }
  if (!cdp.ok) {
    throw new Error(`CDP endpoint is not reachable at ${cdp.url}. Run the launch command and log in to ChatGPT first.`);
  }

  const browser = await connectToEdge(port);
  try {
    const page = await getChatGptPage(browser);
    await submitPrompt(page, prompt);
    const answer = await waitForMarker(page, marker, {
      timeoutMs: timeoutMinutes * 60 * 1000,
      pollMs
    });
    const paths = saveReports({
      answer: answer.text,
      marker,
      topic: options.topic || "chatgpt-web-research",
      outDir: options.outDir || "reports",
      chatUrl: page.url(),
      extractionMethod: answer.extractionMethod,
      keepMarker: options.keepMarker === true
    });
    console.log(JSON.stringify({ ok: true, marker, ...paths }, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(help());
    return;
  }
  if (command === "doctor") return doctor(options);
  if (command === "launch" || command === "login") return launch(options);
  if (command === "run") return run(options);
  throw new Error(`Unknown command: ${command}\n\n${help()}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const debug = process.env.EDGE_CHATGPT_DEBUG === "1" || process.env.DEBUG;
    console.error(debug ? (error?.stack ?? error) : (error?.message ?? error));
    process.exitCode = 1;
  });
}

export { parseArgs };
