---
name: edge-chatgpt-web-research
description: Use the user's already signed-in ChatGPT web Pro account through a dedicated Microsoft Edge CDP profile, submit research prompts, wait for a unique completion marker, extract the assistant response, and save verified Markdown reports. Use when the user asks to use ChatGPT web, ChatGPT Pro, web Pro, Edge CDP, or wants Codex to route research through the real ChatGPT website instead of API/web search.
---

# Edge ChatGPT Web Research

Use this skill to run ChatGPT web research through Microsoft Edge without relying on foreground Computer Use. Use the real ChatGPT website in the dedicated Edge profile; do not answer from the OpenAI API, generic web search, or model memory.

## Primary Command

Prefer the wrapper. It installs dependencies if needed, runs the CLI, and attempts recovery if the page finishes after the main wait:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\run-skill.ps1" -Prompt "<research prompt>" -Topic "<topic-slug>"
```

For a prompt file:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\run-skill.ps1" -PromptFile ".\prompt.md" -Topic "<topic-slug>"
```

Use the project root as the working directory:

```powershell
C:\Users\soulzyn\Desktop\codex\edge-chatgpt-web-research
```

The CLI uses a dedicated Edge profile and connects through CDP on `127.0.0.1:9223`. It must not inspect cookies, local storage, passwords, browser profile files, or session stores.

## First Run

1. Run `node .\src\cli.js launch`.
2. Ask the user to log in to the intended ChatGPT web Pro account manually in the opened Edge window if the composer is not available.
3. Run `node .\src\cli.js doctor` to confirm the CDP endpoint is reachable.
4. Submit research with `scripts\run-skill.ps1`.

## Prompt Requirements

Build a self-contained prompt with:

- current date
- exact research target
- required report sections
- source and uncertainty requirements
- a unique final marker, or let the CLI append one automatically

## Validation

Before reporting success:

- Confirm the wrapper or CLI completed without error, or that recovery saved the latest marked response.
- Confirm the raw report contains the marker when recovery is marker-based.
- Confirm the readable report was saved and read back.
- Return the saved paths.

## Safety

Keep generated reports and Edge profile data out of git. Stop if ChatGPT shows login, CAPTCHA, 2FA, account selection, or a model/paywall state that requires user judgment.
