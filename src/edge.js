import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_PORT = 9223;

export function defaultPort() {
  return DEFAULT_PORT;
}

export function defaultProfileDir() {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    return path.join(localAppData, "Codex", "edge-chatgpt-profile");
  }
  return path.join(os.homedir(), ".codex", "edge-chatgpt-profile");
}

export function findEdgeExecutable(explicitPath) {
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`Edge executable was not found: ${explicitPath}`);
    }
    return explicitPath;
  }

  const candidates = [
    process.env.MSEDGE_PATH,
    path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Microsoft Edge executable was not found. Pass --edge C:\\path\\to\\msedge.exe.");
  }
  return found;
}

export async function probeCdp(port = DEFAULT_PORT) {
  const url = `http://127.0.0.1:${port}/json/version`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) {
      return { ok: false, url, status: response.status };
    }
    const body = await response.json();
    return { ok: true, url, body };
  } catch (error) {
    return { ok: false, url, error: String(error?.message ?? error) };
  }
}

export async function waitForCdp(port = DEFAULT_PORT, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastProbe = await probeCdp(port);
  while (!lastProbe.ok && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    lastProbe = await probeCdp(port);
  }
  return lastProbe;
}

export async function launchEdge({
  edgePath,
  profileDir = defaultProfileDir(),
  port = DEFAULT_PORT,
  url = "https://chatgpt.com/",
  wait = true
} = {}) {
  const executable = findEdgeExecutable(edgePath);
  mkdirSync(profileDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
    url
  ];

  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  child.unref();

  if (!wait) {
    return { edgePath: executable, profileDir, port, pid: child.pid, cdp: null };
  }

  const cdp = await waitForCdp(port);
  return { edgePath: executable, profileDir, port, pid: child.pid, cdp };
}
