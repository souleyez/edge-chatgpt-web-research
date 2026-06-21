import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";

const CHATGPT_URL = "https://chatgpt.com/";

const COMPOSER_SELECTORS = [
  "#prompt-textarea",
  "[data-testid='prompt-textarea']",
  "[contenteditable='true'][data-lexical-editor='true']",
  "textarea[placeholder*='Message']",
  "textarea[placeholder*='Ask']",
  "textarea",
  "[contenteditable='true']"
];

const SEND_SELECTORS = [
  "[data-testid='send-button']",
  "[data-testid='composer-send-button']",
  "button[aria-label='Send prompt']",
  "button[aria-label='Send message']",
  "button[aria-label*='Send']",
  "button[aria-label*='发送']"
];

const STOP_SELECTORS = [
  "[data-testid='stop-button']",
  "button[aria-label*='Stop']",
  "button[aria-label*='停止']"
];

export function createMarker() {
  return `[[CHATGPT_WEB_RESEARCH_DONE_${randomUUID()}]]`;
}

export function ensurePromptMarker(prompt, marker) {
  if (prompt.includes(marker)) {
    return prompt;
  }
  return `${prompt.trimEnd()}\n\n回答最后单独一行输出：${marker}\n`;
}

export async function connectToEdge(port) {
  return chromium.connectOverCDP(`http://127.0.0.1:${port}`);
}

export async function getChatGptPage(browser, { preferExisting = true } = {}) {
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const pages = context.pages();
  const existing = pages.find((page) => {
    const url = page.url();
    return /^https:\/\/chatgpt\.com\b/i.test(url) || /^https:\/\/chat\.openai\.com\b/i.test(url);
  });
  const page = preferExisting && existing ? existing : await context.newPage();
  if (!/^https:\/\/chatgpt\.com\b/i.test(page.url())) {
    await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  return page;
}

async function firstVisibleLocator(page, selectors, timeout = 1000) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout });
      return { selector, locator };
    } catch {
      // Try the next selector.
    }
  }
  return null;
}

export async function assertComposerReady(page) {
  const loginText = await page.locator("text=/Log in|Sign up|登录|注册/i").count().catch(() => 0);
  const visibleLogin = loginText > 0
    ? await page.locator("text=/Log in|Sign up|登录|注册/i").first().isVisible({ timeout: 500 }).catch(() => false)
    : false;
  if (visibleLogin) {
    throw new Error("ChatGPT appears to be signed out in the dedicated Edge profile. Log in manually, then rerun.");
  }

  const composer = await firstVisibleLocator(page, COMPOSER_SELECTORS, 1500);
  if (composer) return composer;

  throw new Error("ChatGPT composer was not found. The page may still be loading or the UI changed.");
}

async function composerText(locator) {
  const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
  if (tagName === "textarea" || tagName === "input") {
    return locator.inputValue({ timeout: 1000 }).catch(() => "");
  }
  return locator.innerText({ timeout: 1000 }).catch(() => "");
}

export async function submitPrompt(page, prompt) {
  const { locator: composer } = await assertComposerReady(page);
  await composer.click({ timeout: 5000 });

  let filled = false;
  try {
    await composer.fill(prompt, { timeout: 10000 });
    filled = true;
  } catch {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.insertText(prompt);
    filled = true;
  }

  if (!filled) {
    throw new Error("Failed to write prompt into ChatGPT composer.");
  }

  const visibleText = await composerText(composer);
  if (!visibleText.includes("[[CHATGPT_WEB_RESEARCH_DONE")) {
    throw new Error("Prompt marker was not visible in the composer after entry.");
  }

  const send = await firstVisibleLocator(page, SEND_SELECTORS, 5000);
  if (send) {
    await send.locator.click({ timeout: 10000 });
  } else {
    await page.keyboard.press("Enter");
  }
}

export async function extractAssistantMessages(page) {
  const messages = await page
    .locator("[data-message-author-role='assistant']")
    .evaluateAll((nodes) =>
      nodes.map((node, index) => ({
        index,
        text: node.innerText || node.textContent || ""
      }))
    )
    .catch(() => []);

  if (messages.length) {
    return messages;
  }

  return page
    .locator("article")
    .evaluateAll((nodes) =>
      nodes
        .map((node, index) => ({ index, text: node.innerText || node.textContent || "" }))
        .filter((message) => message.text.trim().length > 0)
    )
    .catch(() => []);
}

async function isGenerating(page) {
  for (const selector of STOP_SELECTORS) {
    const visible = await page.locator(selector).first().isVisible({ timeout: 500 }).catch(() => false);
    if (visible) return true;
  }
  return false;
}

export async function waitForMarker(page, marker, { timeoutMs = 45 * 60 * 1000, pollMs = 5000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastText = "";

  while (Date.now() < deadline) {
    const messages = await extractAssistantMessages(page);
    const lastAssistant = messages.at(-1);
    if (lastAssistant?.text) {
      lastText = lastAssistant.text.trim();
      if (lastText.includes(marker)) {
        if (!(await isGenerating(page))) {
          return {
            text: lastText,
            extractionMethod: "[data-message-author-role='assistant']"
          };
        }
      }
    }
    await page.waitForTimeout(pollMs);
  }

  throw new Error(`Timed out waiting for ChatGPT marker. Last assistant text length: ${lastText.length}`);
}
