---
name: edge-chatgpt-web-research
description: Use a dedicated Microsoft Edge CDP profile to operate the real ChatGPT website, submit research prompts, wait for a unique completion marker, extract the assistant response, and save verified Markdown reports. Use when Chrome extension control is unavailable but Edge with remote debugging is acceptable for personal ChatGPT web research.
---

# Edge ChatGPT Web Research

Use this skill to run ChatGPT web research through Microsoft Edge without relying on foreground Computer Use.

## Route

Use the local CLI in this repository:

```powershell
node .\src\cli.js doctor
node .\src\cli.js launch
node .\src\cli.js run --prompt-file .\prompt.md --topic topic-name
```

The CLI uses a dedicated Edge profile and connects through CDP on `127.0.0.1`. It must not inspect cookies, local storage, passwords, browser profile files, or session stores.

## First Run

1. Run `node .\src\cli.js launch`.
2. Ask the user to log in to ChatGPT manually in the opened Edge window if the composer is not available.
3. Run `node .\src\cli.js doctor` to confirm the CDP endpoint is reachable.
4. Submit research with `run`.

## Prompt Requirements

Build a self-contained prompt with:

- current date
- exact research target
- required report sections
- source and uncertainty requirements
- a unique final marker, or let the CLI append one

## Validation

Before reporting success:

- Confirm the CLI completed without error.
- Confirm the raw report contains the marker.
- Confirm the readable report was saved and read back.
- Return the saved paths.

## Safety

Keep generated reports and Edge profile data out of git. Stop if ChatGPT shows login, CAPTCHA, 2FA, account selection, or a model/paywall state that requires user judgment.
