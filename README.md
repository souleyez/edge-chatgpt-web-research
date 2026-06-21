# edge-chatgpt-web-research

Use a dedicated Microsoft Edge profile plus Chrome DevTools Protocol (CDP) to run research through the real ChatGPT web page, wait for a completion marker, extract the response, and save Markdown reports.

This project is for personal browser automation. It does not read cookies, local storage, passwords, browser profile files, or session stores. It only connects to an Edge instance you launch with `--remote-debugging-port`.

## Why Edge CDP

The official Codex browser route uses Google Chrome plus the Codex Chrome Extension. This project is a practical Edge alternative:

- Uses a dedicated Edge profile so your normal browsing session stays separate.
- Uses Playwright over CDP instead of foreground mouse/screenshot automation.
- Keeps browser state out of the repository.
- Writes reproducible raw and readable Markdown reports.

## Install

```powershell
git clone https://github.com/souleyez/edge-chatgpt-web-research.git
cd edge-chatgpt-web-research
npm install
```

## First Login

Launch the dedicated Edge profile:

```powershell
npm run launch
```

An Edge window opens at `https://chatgpt.com/` using:

```text
C:\Users\<you>\AppData\Local\Codex\edge-chatgpt-profile
```

Log in to ChatGPT manually in that Edge window. The login state stays inside that dedicated profile directory.

## Run Research

Start from the included prompt template:

```powershell
Copy-Item .\examples\prompt.zh.md .\prompt.md
```

Run:

```powershell
node .\src\cli.js run --prompt-file .\prompt.md --topic edge-cdp-chatgpt
```

Or skip the file and pass a short prompt inline:

```powershell
node .\src\cli.js run --prompt "请联网调研 Microsoft Edge CDP 自动化用于个人 ChatGPT 网页调研的可行性，输出中文 Markdown 报告。" --topic edge-cdp-chatgpt
```

The CLI adds a unique marker automatically if your prompt does not include one. Reports are written to `reports/`:

- `YYYY-MM-DD-topic-chatgpt-web-raw.md`
- `YYYY-MM-DD-topic.md`

## Commands

```powershell
node .\src\cli.js doctor
node .\src\cli.js launch
node .\src\cli.js run --prompt-file .\prompt.md --topic my-topic
```

Useful options:

- `--port 9223`
- `--profile C:\path\to\edge-profile`
- `--edge C:\path\to\msedge.exe`
- `--out-dir reports`
- `--timeout-minutes 45`
- `--poll-ms 5000`
- `--no-launch`
- `--keep-marker`

## Safety Boundary

Do not point this tool at your daily browser profile. Use the dedicated profile path.

Never commit:

- Edge profile folders
- cookies or session files
- generated reports containing private data
- `.env` files

The repository `.gitignore` excludes the default sensitive outputs.

## Codex Skill

This repository also contains a root `SKILL.md`, so a Codex instance can use the same project as a reusable workflow after cloning or installing it as a local skill.
