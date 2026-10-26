# Aterx

Aterx is a browser lab for first and second year cyber security and IT students. You learn practical Linux commands by typing them. Each lesson is a short goal, a starter directory, and a few tasks that mark themselves.

There is no host shell. Commands never leave the tab.

## Folder structure

```
content/lessons/          lesson JSON. Add a module by adding a file here.
src/app/                  routes: landing, lessons, case, about, lesson player, sandbox, account, pricing
src/lib/case/             generated Brightwater Office log case
src/components/terminal/  xterm.js terminal
src/components/lesson/    task list, cheat sheet, lesson player
src/components/ui/        button, input, badge, dialog, tabs
src/lib/shell/            virtual filesystem, parser, built-in commands
src/lib/lessons/          Zod schema, catalog, task checks
src/lib/plans.ts          Free, Pro, Plus
src/lib/progress/         local account and saved ticks
tests/                    shell behaviour and lesson solutions
```

## Setup

Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

The dev server listens on port **3847** (`http://127.0.0.1:3847`).

```bash
npm test
npm run lint
npm run build
```

No environment variables and no paid APIs. Plan selection and progress stay in `localStorage` under `aterx.account.v1`.

## How the sandbox works

Aterx does not boot Linux and does not call `child_process`. Isolation is structural:

1. **xterm.js** draws the screen and sends keystrokes to the page.
2. **`LabShell`** (`src/lib/shell/shell.ts`) is a line editor: history, tab completion, and a small pager for `less`.
3. The line is parsed for quotes, `$VARS`, globs, pipes, `&&` / `||` / `;`, and redirects (`>`, `>>`, `2>`, `2>&1`).
4. Only the built-ins in `src/lib/shell/commands.ts` can run. Anything else, including `curl` and `./script.sh`, returns an error. The shell does not execute file contents.
5. Built-ins read and write an **in-memory filesystem** (`src/lib/shell/vfs.ts`). Paths cannot climb above `/`. Permission bits are checked for the session user, `student`.
6. `/dev/null` discards writes. There is no network from a command.

A multi-command pipeline does not keep `cd` or variable changes, which matches a subshell. Files written in a pipeline stay written, because the filesystem is shared.

This is a teaching model of the commands on the cheat sheet, not a GNU userspace. Unsupported flags return an error instead of being silently ignored. `man <command>` prints the short page for that built-in.

`chown` is deliberately looser than a university server: if you own a file, this lab lets you give it away so `ls -l` changes. The lesson says so. You still cannot `chown` a file you do not own.

## Plans

| Plan | What it opens |
| --- | --- |
| Free | Lessons 1–2, hints, cheat sheet, home sandbox |
| Pro | All five lessons, hints, cheat sheet, home sandbox |
| Plus | Solution reveals, plus the log shelf and permissions sandbox presets |

Prices on the site are examples in AUD. Choosing a plan writes it to this browser. Nothing is charged. The gate is interface state, not a secret: lesson JSON, including solutions, ships in the page so the checks can run locally.

## Lesson schema

Lessons are JSON files validated by `lessonSchema` in `src/lib/lessons/schema.ts`.

```json
{
  "slug": "navigate",
  "number": 1,
  "title": "Find your way around",
  "module": "Files and directories",
  "minutes": 12,
  "minPlan": "free",
  "goal": "One or two sentences.",
  "cwd": "/home/student",
  "cheatSheet": [{ "command": "pwd", "description": "Print the working directory." }],
  "files": [
    { "path": "/home/student/labs/readme.txt", "content": "Week 1 lives in week1.\n", "mode": "644", "owner": "student" }
  ],
  "tasks": [
    {
      "id": "print-home",
      "prompt": "Print the directory you are in.",
      "hint": "Three letters.",
      "solution": "pwd",
      "check": {
        "type": "all",
        "checks": [
          { "type": "command", "pattern": "(^|[|&;])\\s*pwd\\b" },
          { "type": "stdoutEquals", "text": "/home/student" }
        ]
      }
    }
  ]
}
```

`tasks` must contain 3 to 6 items. `minPlan` is `free`, `pro`, or `plus`.

### Checks

A task stays marked once any later command makes its check true. Checks can nest with `all` and `any`.

| `type` | Fields | Passes when |
| --- | --- | --- |
| `command` | `pattern` | The trimmed command line matches the regex |
| `cwd` | `equals` | The working directory is exactly that path |
| `outputIncludes` | `text` | stdout + stderr contains the text |
| `outputExcludes` | `text` | stdout + stderr does not contain the text |
| `outputMatches` | `pattern` | stdout matches the regex |
| `stdoutEquals` | `text` | trimmed stdout equals the text |
| `stdoutLineCount` | `min`, `max` | stdout line count is inside the range |
| `exitCode` | `equals` | the command's exit code |
| `pathExists` | `path`, `kind?` | the path exists (`file` or `dir`) |
| `pathMissing` | `path` | the path is gone |
| `fileContains` | `path`, `text` | the file's contents include the text |
| `mode` | `path`, `octal` | the permission bits, for example `"600"` |
| `owner` | `path`, `user` | owner name (`student`, `lab`, or `root`) |
| `ownerExec` | `path` | the owner execute bit is set |
| `all` / `any` | `checks` | every check, or any check |

`command` patterns should allow equivalent forms. `cd labs/week1` and `cd /home/student/labs/week1` both land on a `cwd` check. Anchor command names so `rmdir` does not satisfy a check for `rm`.

The base image already has `/home/student`, `/tmp`, `/etc/passwd`, `/etc/group`, and a short `/home/student/.bashrc`. Lesson files are added on top. Parents are created for you.

## Add a lesson

1. Copy `content/lessons/01-navigate.json` to the next number, for example `content/lessons/06-processes.json`.
2. Keep the goal to reading and administering a lab machine. Do not add exploit steps, scanning, or break-in exercises.
3. Import the file and add it to the `sources` array in `src/lib/lessons/catalog.ts`.
4. Run `npm test`. The suite runs every task's `solution` in order and expects each task to mark.

Set `minPlan` to `pro` or `plus` if the lesson should stay behind those plans. Free currently includes lessons whose `minPlan` is `free`.

## Case

`/case` builds a fictional Brightwater Office log in the browser. The questions are fixed. Generate swaps only the documentation-range addresses, which of those addresses are the odd ones, and the `.example` website names.

Four steps, in order: find the web log, write the address that requested missing pages, write the website that is not on `allow.txt`, then write the address that called it. A later step stays closed until the one above is marked. Notes are stored with the case in `localStorage` under `aterx.case.v1`. Leaving the page resets the live folder and keeps the ticks, the same way a lesson does.

The case is open on every plan. It is still the in-browser shell: grep and find read the generated files, and nothing is sent to a server.

## Deploy

The app is a Next.js project with no server-side shell, so it can deploy to Vercel with the default build (`npm run build`). There is nothing to put in project environment variables.
