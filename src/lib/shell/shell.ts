import { runCommand, COMMAND_NAMES, type CmdResult } from "./commands";
import { expandWord, parseLine, ParseError, type SimpleCommand, type Word } from "./parse";
import { createLabVfs, type SeedFile, type Vfs } from "./vfs";
import type { GradeContext } from "../lessons/grader";

export type LabSeed = {
  cwd: string;
  files: SeedFile[];
};

export type { GradeContext };

type Pager = {
  lines: string[];
  row: number;
};

const PAGE_SIZE = 20;

export class LabShell {
  private vfs: Vfs;
  private cwd: string;
  private env: Record<string, string>;
  private readonly seed: LabSeed;
  private readonly out: (data: string) => void;
  private readonly onCommand?: (event: GradeContext) => void;
  private history: string[] = [];
  private histIndex: number | null = null;
  private draft = "";
  private buffer = "";
  private cursor = 0;
  private pending = "";
  private pager: Pager | null = null;
  private queuedNotes: string[] = [];
  private lastStatus = 0;

  constructor(options: {
    write: (data: string) => void;
    seed: LabSeed;
    onCommand?: (event: GradeContext) => void;
  }) {
    this.out = options.write;
    this.seed = options.seed;
    this.onCommand = options.onCommand;
    this.vfs = createLabVfs(options.seed.files);
    this.cwd = options.seed.cwd;
    this.env = this.freshEnv();
  }

  start(): void {
    this.emit("\x1b[92mAterx lab\x1b[0m\n");
    this.emit("Commands stay in this browser.\n\n");
    this.redraw();
  }

  reset(): void {
    this.vfs = createLabVfs(this.seed.files);
    this.cwd = this.seed.cwd;
    this.env = this.freshEnv();
    this.buffer = "";
    this.cursor = 0;
    this.pager = null;
    this.queuedNotes = [];
    this.pending = "";
    this.emit("\n\x1b[92mLab reset.\x1b[0m Folder restored. Saved ticks stay.\n");
    this.redraw();
  }

  isPaging(): boolean {
    return this.pager !== null;
  }

  aside(message: string): void {
    if (this.pager) {
      this.queuedNotes.push(message);
      return;
    }
    this.emit(`\x1b[92m· ${message}\x1b[0m\n`);
  }

  input(data: string): void {
    this.pending += data;
    this.drain();
  }

  private freshEnv(): Record<string, string> {
    return {
      HOME: "/home/student",
      USER: "student",
      LOGNAME: "student",
      SHELL: "/bin/aterx",
      PWD: this.seed.cwd,
      OLDPWD: this.seed.cwd,
      TERM: "xterm-256color",
      PATH: "/usr/bin:/bin",
    };
  }

  private emit(data: string): void {
    this.out(data.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
  }

  private prettyCwd(): string {
    const home = this.env.HOME || "/home/student";
    if (this.cwd === home) return "~";
    if (this.cwd.startsWith(`${home}/`)) return `~${this.cwd.slice(home.length)}`;
    return this.cwd;
  }

  private redraw(): void {
    const cwd = this.prettyCwd();
    const prompt = `\x1b[92mstudent@aterx\x1b[0m:\x1b[32m${cwd}\x1b[0m$ `;
    this.emit(`\r\x1b[2K${prompt}${this.buffer}`);
    const back = this.buffer.length - this.cursor;
    if (back > 0) this.emit(`\x1b[${back}D`);
  }

  private drain(): void {
    let data = this.pending;
    while (data.length > 0) {
      if (data[0] === "\u001b") {
        const match = /^\u001b(?:\[[0-9;]*[~A-Za-z]|O[A-Z])/.exec(data);
        if (!match) {
          if (data.length < 6) {
            this.pending = data;
            return;
          }
          data = data.slice(1);
          continue;
        }
        this.handleSequence(match[0]);
        data = data.slice(match[0].length);
        continue;
      }
      const char = data[0];
      data = data.slice(1);
      this.handleChar(char);
    }
    this.pending = "";
  }

  private handleSequence(sequence: string): void {
    if (this.pager) {
      if (sequence === "\u001b[A" || sequence === "\u001b[5~") this.page(-PAGE_SIZE);
      if (sequence === "\u001b[B" || sequence === "\u001b[6~") this.page(PAGE_SIZE);
      return;
    }
    if (sequence === "\u001b[A") this.historyUp();
    else if (sequence === "\u001b[B") this.historyDown();
    else if (sequence === "\u001b[C") this.move(1);
    else if (sequence === "\u001b[D") this.move(-1);
    else if (sequence === "\u001b[H" || sequence === "\u001bOH") this.moveHome();
    else if (sequence === "\u001b[F" || sequence === "\u001bOF") this.moveEnd();
    else if (sequence === "\u001b[3~") this.deleteForward();
  }

  private handleChar(char: string): void {
    if (this.pager) {
      if (char === "q" || char === "Q" || char === "\u0003") this.closePager();
      else if (char === " " || char === "f") this.page(PAGE_SIZE);
      else if (char === "b" || char === "u") this.page(-PAGE_SIZE);
      else if (char === "\r" || char === "\n") this.page(1);
      else if (char === "g") this.pageTo(0);
      else if (char === "G") this.pageTo(Math.max(0, this.pager.lines.length - PAGE_SIZE));
      return;
    }
    if (char === "\r" || char === "\n") {
      this.submit();
      return;
    }
    if (char === "\u007f" || char === "\b") {
      this.backspace();
      return;
    }
    if (char === "\t") {
      this.complete();
      return;
    }
    if (char === "\u0003") {
      this.emit("^C\n");
      this.buffer = "";
      this.cursor = 0;
      this.histIndex = null;
      this.redraw();
      return;
    }
    if (char === "\u000c") {
      this.emit("\x1b[2J\x1b[H");
      this.redraw();
      return;
    }
    if (char === "\u0015") {
      this.buffer = this.buffer.slice(this.cursor);
      this.cursor = 0;
      this.redraw();
      return;
    }
    if (char === "\u0001") {
      this.moveHome();
      return;
    }
    if (char === "\u0005") {
      this.moveEnd();
      return;
    }
    if (char < " ") return;
    this.buffer = this.buffer.slice(0, this.cursor) + char + this.buffer.slice(this.cursor);
    this.cursor += 1;
    this.histIndex = null;
    this.redraw();
  }

  private submit(): void {
    const line = this.buffer;
    this.emit("\n");
    this.buffer = "";
    this.cursor = 0;
    this.histIndex = null;
    if (!line.trim()) {
      this.redraw();
      return;
    }
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    const result = this.execute(line);
    this.lastStatus = result.code;
    if (result.clear) this.emit("\x1b[2J\x1b[H");
    if (result.stderr) this.emit(result.stderr);
    const event: GradeContext = {
      line,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
      cwd: this.cwd,
      files: this.vfs.snapshot(),
    };
    if (result.pager) {
      this.pager = { lines: result.pager, row: 0 };
      this.onCommand?.(event);
      this.renderPager();
      return;
    }
    if (result.stdout) this.emit(result.stdout);
    this.onCommand?.(event);
    this.redraw();
  }

  private execute(line: string): CmdResult {
    let script;
    try {
      script = parseLine(line);
    } catch (error) {
      if (error instanceof ParseError) {
        return { stdout: "", stderr: `bash: ${error.message}\n`, code: 2 };
      }
      throw error;
    }
    if (script.pipelines.length === 0) return { stdout: "", stderr: "", code: 0 };

    let code = 0;
    let stdout = "";
    let stderr = "";
    let clear = false;
    let pager: string[] | undefined;

    for (let index = 0; index < script.pipelines.length; index++) {
      if (index > 0) {
        const op = script.ops[index - 1];
        if (op === "&&" && code !== 0) continue;
        if (op === "||" && code === 0) continue;
      }
      const result = this.runPipeline(script.pipelines[index]);
      stdout += result.stdout;
      stderr += result.stderr;
      code = result.code;
      clear = clear || Boolean(result.clear);
      if (result.pager) pager = result.pager;
    }
    return { stdout, stderr, code, clear, pager };
  }

  private runPipeline(commands: SimpleCommand[]): CmdResult {
    const multi = commands.length > 1;
    let stdin = "";
    let stderr = "";
    let code = 0;
    let clear = false;
    let pager: string[] | undefined;
    let lastStdout = "";

    for (let index = 0; index < commands.length; index++) {
      const snapCwd = this.cwd;
      const snapEnv = { ...this.env };
      const command = commands[index];
      const isLast = index === commands.length - 1;
      const prepared = this.prepare(command, stdin);
      if (prepared.error) {
        stderr += prepared.error;
        code = prepared.code;
        stdin = "";
        lastStdout = "";
        if (multi) {
          this.cwd = snapCwd;
          this.env = snapEnv;
        }
        continue;
      }

      const result =
        prepared.argv.length === 0
          ? { stdout: "", stderr: "", code: 0 }
          : runCommand(prepared.argv, this.makeIo(prepared.stdin, isLast && !prepared.stdoutTarget));
      code = result.code;
      clear = clear || Boolean(result.clear);
      if (result.pager && isLast && !prepared.stdoutTarget) pager = result.pager;

      let out = result.stdout;
      let err = result.stderr;
      if (prepared.stderrToStdout) {
        out += err;
        err = "";
      } else if (prepared.stderrTarget) {
        const writeError = this.writeRedirect(prepared.stderrTarget, err);
        err = writeError ?? "";
        if (writeError) code = 1;
      }
      if (prepared.stdoutTarget) {
        const writeError = this.writeRedirect(prepared.stdoutTarget, out);
        if (writeError) {
          err += writeError;
          code = 1;
        }
        stdin = "";
        lastStdout = "";
      } else if (!isLast) {
        stdin = out;
        lastStdout = "";
      } else {
        lastStdout = out;
      }
      stderr += err;
      if (multi) {
        this.cwd = snapCwd;
        this.env = snapEnv;
      }
    }

    return { stdout: lastStdout, stderr, code, clear, pager };
  }

  private prepare(command: SimpleCommand, stdin: string): {
    argv: string[];
    stdin: string;
    stdoutTarget: { path: string; append: boolean } | null;
    stderrTarget: { path: string; append: boolean } | null;
    stderrToStdout: boolean;
    error?: string;
    code: number;
  } {
    let commandStdin = stdin;
    let stdoutTarget: { path: string; append: boolean } | null = null;
    let stderrTarget: { path: string; append: boolean } | null = null;
    let stderrToStdout = false;

    for (const redirect of command.redirects) {
      const raw = expandWord(redirect.target, this.env, this.lastStatus);
      if (redirect.fd === 2 && raw === "&1") {
        stderrToStdout = true;
        continue;
      }
      const matches =
        redirect.target.canGlob && /[*?]/.test(raw) ? this.vfs.glob(this.cwd, raw) : [raw];
      if (matches.length !== 1) {
        return {
          argv: [],
          stdin,
          stdoutTarget: null,
          stderrTarget: null,
          stderrToStdout: false,
          error: `bash: ${raw}: ambiguous redirect\n`,
          code: 1,
        };
      }
      const abs = this.vfs.resolve(this.cwd, matches[0]);
      if (redirect.fd === 0) {
        try {
          commandStdin = this.vfs.readFile(abs);
        } catch (error) {
          return {
            argv: [],
            stdin,
            stdoutTarget: null,
            stderrTarget: null,
            stderrToStdout: false,
            error: `bash: ${matches[0]}: ${error instanceof Error ? error.message : "No such file"}\n`,
            code: 1,
          };
        }
      } else if (redirect.fd === 1) stdoutTarget = { path: abs, append: redirect.append };
      else if (redirect.fd === 2) stderrTarget = { path: abs, append: redirect.append };
    }

    let argv = this.expandArgv(command.argv);
    if (argv.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
      const eq = argv[0].indexOf("=");
      this.env[argv[0].slice(0, eq)] = argv[0].slice(eq + 1);
      argv = [];
    }
    return { argv, stdin: commandStdin, stdoutTarget, stderrTarget, stderrToStdout, code: 0 };
  }

  private writeRedirect(target: { path: string; append: boolean }, data: string): string | null {
    try {
      this.vfs.writeFile(target.path, data, { append: target.append });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Permission denied";
      return `bash: ${target.path}: ${message}\n`;
    }
  }

  private expandArgv(words: Word[]): string[] {
    const argv: string[] = [];
    for (const word of words) {
      const text = expandWord(word, this.env, this.lastStatus);
      if (word.canGlob && /[*?]/.test(text)) argv.push(...this.vfs.glob(this.cwd, text));
      else argv.push(text);
    }
    return argv;
  }

  private makeIo(stdin: string, isTty: boolean) {
    return {
      stdin,
      vfs: this.vfs,
      cwd: this.cwd,
      env: this.env,
      user: this.vfs.user,
      isTty,
      history: this.history,
      setCwd: (abs: string) => {
        this.cwd = abs;
      },
    };
  }

  private renderPager(): void {
    if (!this.pager) return;
    const start = this.pager.row;
    const slice = this.pager.lines.slice(start, start + PAGE_SIZE);
    const end = Math.min(start + PAGE_SIZE, this.pager.lines.length);
    const atEnd = end >= this.pager.lines.length;
    const body = slice.join("\n");
    const status = atEnd
      ? "\n\x1b[7m (END) \x1b[0m  q quit"
      : `\n\x1b[7m ${start + 1}-${end} / ${this.pager.lines.length} \x1b[0m  space next · b back · q quit`;
    this.emit("\x1b[2J\x1b[H");
    this.emit(body + status);
  }

  private page(delta: number): void {
    if (!this.pager) return;
    this.pageTo(this.pager.row + delta);
  }

  private pageTo(row: number): void {
    if (!this.pager) return;
    const max = Math.max(0, this.pager.lines.length - PAGE_SIZE);
    this.pager.row = Math.max(0, Math.min(max, row));
    this.renderPager();
  }

  private closePager(): void {
    this.pager = null;
    this.emit("\x1b[2J\x1b[H");
    for (const note of this.queuedNotes) this.emit(`\x1b[92m· ${note}\x1b[0m\n`);
    this.queuedNotes = [];
    this.redraw();
  }

  private move(delta: number): void {
    this.cursor = Math.max(0, Math.min(this.buffer.length, this.cursor + delta));
    this.redraw();
  }

  private moveHome(): void {
    this.cursor = 0;
    this.redraw();
  }

  private moveEnd(): void {
    this.cursor = this.buffer.length;
    this.redraw();
  }

  private backspace(): void {
    if (this.cursor === 0) return;
    this.buffer = this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor);
    this.cursor -= 1;
    this.redraw();
  }

  private deleteForward(): void {
    if (this.cursor >= this.buffer.length) return;
    this.buffer = this.buffer.slice(0, this.cursor) + this.buffer.slice(this.cursor + 1);
    this.redraw();
  }

  private historyUp(): void {
    if (this.history.length === 0) return;
    if (this.histIndex === null) {
      this.draft = this.buffer;
      this.histIndex = this.history.length - 1;
    } else if (this.histIndex > 0) this.histIndex -= 1;
    this.buffer = this.history[this.histIndex] ?? "";
    this.cursor = this.buffer.length;
    this.redraw();
  }

  private historyDown(): void {
    if (this.histIndex === null) return;
    if (this.histIndex < this.history.length - 1) {
      this.histIndex += 1;
      this.buffer = this.history[this.histIndex] ?? "";
    } else {
      this.histIndex = null;
      this.buffer = this.draft;
    }
    this.cursor = this.buffer.length;
    this.redraw();
  }

  private complete(): void {
    const before = this.buffer.slice(0, this.cursor);
    const after = this.buffer.slice(this.cursor);
    const match = /(?:^|\s)([^\s]*)$/.exec(before);
    const token = match?.[1] ?? "";
    const tokenStart = before.length - token.length;
    const first = !/\s/.test(before.slice(0, tokenStart));
    const options = first ? COMMAND_NAMES.filter((name) => name.startsWith(token)) : this.completePath(token);
    if (options.length === 0) return;
    if (options.length === 1) {
      let fill = options[0];
      if (!first && this.isDir(fill)) fill += "/";
      else fill += " ";
      this.buffer = before.slice(0, tokenStart) + fill + after;
      this.cursor = tokenStart + fill.length;
      this.redraw();
      return;
    }
    const prefix = sharedPrefix(options);
    if (prefix.length > token.length) {
      this.buffer = before.slice(0, tokenStart) + prefix + after;
      this.cursor = tokenStart + prefix.length;
      this.redraw();
      return;
    }
    this.emit(`\n${options.join("  ")}\n`);
    this.redraw();
  }

  private completePath(token: string): string[] {
    const slash = token.lastIndexOf("/");
    const prefix = slash === -1 ? token : token.slice(slash + 1);
    const dirInput = slash === -1 ? "." : token.slice(0, slash) || "/";
    try {
      const abs = this.vfs.resolve(this.cwd, dirInput);
      return this.vfs
        .readdir(abs)
        .filter((name) => (prefix.startsWith(".") || !name.startsWith(".")) && name.startsWith(prefix))
        .map((name) => (slash === -1 ? name : `${token.slice(0, slash + 1)}${name}`));
    } catch {
      return [];
    }
  }

  private isDir(token: string): boolean {
    try {
      return this.vfs.stat(this.vfs.resolve(this.cwd, token)).type === "dir";
    } catch {
      return false;
    }
  }
}

function sharedPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}
