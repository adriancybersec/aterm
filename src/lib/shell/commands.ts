import { MAN_PAGES, HELP_TEXT } from "./man";
import {
  applyMode,
  formatMode,
  formatMtime,
  fsWhy,
  globToRegExp,
  groupName,
  splitLines,
  userName,
} from "./format";
import { FsError, GROUP_IDS, IDENTITIES, type Identity, type Vfs } from "./vfs";

export const COMMAND_NAMES = [
  "pwd",
  "ls",
  "cd",
  "mkdir",
  "rmdir",
  "touch",
  "rm",
  "cp",
  "mv",
  "cat",
  "head",
  "tail",
  "less",
  "chmod",
  "chown",
  "grep",
  "find",
  "echo",
  "wc",
  "whoami",
  "id",
  "history",
  "man",
  "help",
  "clear",
  "export",
  "unset",
] as const;

export type CmdResult = {
  stdout: string;
  stderr: string;
  code: number;
  clear?: boolean;
  pager?: string[];
};

export type Io = {
  stdin: string;
  vfs: Vfs;
  readonly cwd: string;
  env: Record<string, string>;
  user: Identity;
  isTty: boolean;
  history: readonly string[];
  setCwd: (abs: string) => void;
};

function ok(stdout = ""): CmdResult {
  return { stdout, stderr: "", code: 0 };
}

function fail(stderr: string, code = 1): CmdResult {
  return { stdout: "", stderr: stderr.endsWith("\n") ? stderr : `${stderr}\n`, code };
}

function explain(command: string, error: unknown): string {
  if (error instanceof FsError) {
    const why = error.code === "EINVAL" && error.message ? error.message : fsWhy(error.code);
    return `${command}: ${error.path}: ${why}\n`;
  }
  if (error instanceof Error) return error.message.endsWith("\n") ? error.message : `${error.message}\n`;
  return `${command}: error\n`;
}

function resolve(io: Io, path: string): string {
  return io.vfs.resolve(io.cwd, path);
}

function readArg(io: Io, path: string): string {
  return io.vfs.readFile(resolve(io, path));
}

export function runCommand(argv: string[], io: Io): CmdResult {
  if (argv.length === 0) return ok();
  const name = argv[0];
  if (name.includes("/")) {
    return fail(`bash: ${name}: Aterx does not run programs. It only has built-in commands.`, 126);
  }
  const builtin = BUILTINS[name];
  if (!builtin) return fail(`bash: ${name}: command not found`, 127);
  try {
    return builtin(argv, io);
  } catch (error) {
    return fail(explain(name, error).replace(/\n$/, ""));
  }
}

const BUILTINS: Record<string, (argv: string[], io: Io) => CmdResult> = {
  pwd: (argv, io) => {
    if (argv.length > 1 && argv[1] !== "-P" && argv[1] !== "-L") {
      return fail(`pwd: invalid option -- '${argv[1].replace(/^-/, "")}'`);
    }
    return ok(`${io.cwd}\n`);
  },
  ls: lsCommand,
  cd: cdCommand,
  mkdir: (argv, io) => mutateMany(argv, io, "mkdir", (path, flags) => {
    io.vfs.mkdir(resolve(io, path), flags.has("p"));
  }),
  rmdir: (argv, io) => mutateMany(argv, io, "rmdir", (path) => {
    io.vfs.rmdir(resolve(io, path));
  }),
  touch: (argv, io) => mutateMany(argv, io, "touch", (path) => {
    io.vfs.touch(resolve(io, path));
  }),
  rm: rmCommand,
  cp: cpCommand,
  mv: mvCommand,
  cat: (argv, io) => readFiles(argv, io, "cat", (text) => text),
  head: (argv, io) => sliceFile(argv, io, "head", "start"),
  tail: (argv, io) => sliceFile(argv, io, "tail", "end"),
  less: lessCommand,
  chmod: chmodCommand,
  chown: chownCommand,
  grep: grepCommand,
  find: findCommand,
  echo: echoCommand,
  wc: wcCommand,
  whoami: (_argv, io) => ok(`${io.user.name}\n`),
  id: (_argv, io) => {
    const groups = io.user.groups.map((gid) => `${gid}(${groupName(gid)})`).join(",");
    return ok(
      `uid=${io.user.uid}(${io.user.name}) gid=${io.user.gid}(${groupName(io.user.gid)}) groups=${groups}\n`,
    );
  },
  history: (_argv, io) => {
    if (io.history.length === 0) return ok();
    return ok(io.history.map((line, index) => `  ${index + 1}  ${line}`).join("\n") + "\n");
  },
  man: (argv) => {
    const topic = argv[1];
    if (!topic) return fail("man: what manual page do you want?");
    const page = MAN_PAGES[topic];
    if (!page) return fail(`man: no entry for ${topic}`);
    return { stdout: page.endsWith("\n") ? page : `${page}\n`, stderr: "", code: 0, pager: splitLines(page) };
  },
  help: () => ok(HELP_TEXT.endsWith("\n") ? HELP_TEXT : `${HELP_TEXT}\n`),
  clear: () => ({ stdout: "", stderr: "", code: 0, clear: true }),
  export: exportCommand,
  unset: (argv, io) => {
    for (const name of argv.slice(1)) delete io.env[name];
    return ok();
  },
};

function flagsAndPaths(argv: string[], known: string): { flags: Set<string>; paths: string[]; error?: string } {
  const flags = new Set<string>();
  const paths: string[] = [];
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--") {
      paths.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("-") && arg !== "-") {
      if (arg.startsWith("--")) return { flags, paths, error: `${argv[0]}: unknown option '${arg}'` };
      for (const flag of arg.slice(1)) {
        if (!known.includes(flag)) return { flags, paths, error: `${argv[0]}: invalid option -- '${flag}'` };
        flags.add(flag);
      }
      continue;
    }
    paths.push(arg);
  }
  return { flags, paths };
}

function mutateMany(
  argv: string[],
  io: Io,
  command: string,
  action: (path: string, flags: Set<string>) => void,
): CmdResult {
  const known = command === "mkdir" ? "p" : "";
  const parsed = flagsAndPaths(argv, known);
  if (parsed.error) return fail(parsed.error);
  if (parsed.paths.length === 0) return fail(`${command}: missing operand`);
  const errors: string[] = [];
  for (const path of parsed.paths) {
    try {
      action(path, parsed.flags);
    } catch (error) {
      errors.push(explain(command, error).replace(/\n$/, ""));
    }
  }
  if (errors.length) return fail(errors.join("\n"));
  return ok();
}

function cdCommand(argv: string[], io: Io): CmdResult {
  if (argv.length > 2) return fail("cd: too many arguments");
  const requested = argv[1] ?? io.env.HOME ?? io.user.home;
  const target = requested === "-" ? io.env.OLDPWD || io.cwd : requested;
  const abs = resolve(io, target);
  try {
    io.vfs.assertExecutableDir(abs);
  } catch (error) {
    return fail(explain("cd", error).replace(/\n$/, ""));
  }
  const previous = io.cwd;
  io.setCwd(abs);
  io.env.OLDPWD = previous;
  io.env.PWD = abs;
  return requested === "-" ? ok(`${abs}\n`) : ok();
}

function lsCommand(argv: string[], io: Io): CmdResult {
  const parsed = flagsAndPaths(argv, "lah1");
  if (parsed.error) return fail(parsed.error);
  const paths = parsed.paths.length ? parsed.paths : ["."];
  const long = parsed.flags.has("l");
  const all = parsed.flags.has("a");
  const human = parsed.flags.has("h");
  let stdout = "";
  const errors: string[] = [];

  const formatEntry = (name: string, node: ReturnType<Vfs["stat"]>) => {
    if (!long) return name;
    const size =
      node.type === "dir"
        ? human
          ? "4.0K"
          : "4096"
        : human
          ? humanSize(node.content.length)
          : String(node.content.length);
    return `${formatMode(node)} ${node.type === "dir" ? "2" : "1"} ${userName(node.uid).padEnd(8)} ${groupName(node.gid).padEnd(8)} ${size.padStart(6)} ${formatMtime(node.mtime)} ${name}`;
  };

  paths.forEach((path, pathIndex) => {
    try {
      const abs = resolve(io, path);
      const node = io.vfs.stat(abs);
      if (paths.length > 1 && node.type === "dir") {
        if (pathIndex > 0) stdout += "\n";
        stdout += `${path}:\n`;
      }
      if (node.type === "file") {
        stdout += `${formatEntry(path.split("/").pop() || path, node)}\n`;
        return;
      }
      if (!io.vfs.can(node, "r") || !io.vfs.can(node, "x")) {
        throw new FsError("EACCES", abs);
      }
      const names = io.vfs.readdir(abs);
      const visible = all ? [".", "..", ...names] : names.filter((name) => !name.startsWith("."));
      if (long) {
        const blocks = names.reduce((sum, name) => {
          const child = node.children.get(name)!;
          const bytes = child.type === "dir" ? 4096 : child.content.length;
          return sum + Math.max(1, Math.ceil(bytes / 1024));
        }, 0);
        stdout += `total ${blocks}\n`;
      }
      const lines = visible.map((name) => {
        if (name === ".") return formatEntry(".", node);
        if (name === "..") {
          const parentAbs = abs === "/" ? "/" : abs.slice(0, abs.lastIndexOf("/")) || "/";
          return formatEntry("..", io.vfs.stat(parentAbs));
        }
        return formatEntry(name, node.children.get(name)!);
      });
      stdout += long || !io.isTty ? `${lines.join("\n")}${lines.length ? "\n" : ""}` : columns(lines);
    } catch (error) {
      errors.push(explain("ls", error).replace(/\n$/, ""));
    }
  });

  if (errors.length && !stdout) return fail(errors.join("\n"), 2);
  return { stdout, stderr: errors.length ? `${errors.join("\n")}\n` : "", code: errors.length ? 2 : 0 };
}

function columns(names: string[]): string {
  if (names.length === 0) return "";
  const width = Math.max(...names.map((name) => name.length)) + 2;
  const cols = Math.max(1, Math.floor(72 / width));
  const rows = Math.ceil(names.length / cols);
  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      const index = col * rows + row;
      if (index < names.length) line += names[index].padEnd(width);
    }
    lines.push(line.trimEnd());
  }
  return `${lines.join("\n")}\n`;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return String(bytes);
  return `${(bytes / 1024).toFixed(1)}K`;
}

function rmCommand(argv: string[], io: Io): CmdResult {
  const parsed = flagsAndPaths(argv, "rfR");
  if (parsed.error) return fail(parsed.error);
  if (parsed.paths.length === 0) return fail("rm: missing operand");
  const recursive = parsed.flags.has("r") || parsed.flags.has("R");
  const force = parsed.flags.has("f");
  const errors: string[] = [];
  for (const path of parsed.paths) {
    const abs = resolve(io, path);
    if (abs === "/") {
      errors.push("rm: refusing to remove '/'");
      continue;
    }
    try {
      io.vfs.rm(abs, { recursive, force });
    } catch (error) {
      if (error instanceof FsError && error.code === "EISDIR") {
        errors.push(`rm: cannot remove '${path}': Is a directory`);
      } else {
        errors.push(explain("rm", error).replace(/\n$/, ""));
      }
    }
  }
  if (errors.length) return fail(errors.join("\n"));
  return ok();
}

function cpCommand(argv: string[], io: Io): CmdResult {
  return transfer(argv, io, "cp", false);
}

function mvCommand(argv: string[], io: Io): CmdResult {
  return transfer(argv, io, "mv", true);
}

function transfer(argv: string[], io: Io, command: "cp" | "mv", removeSource: boolean): CmdResult {
  let recursive = removeSource;
  const args: string[] = [];
  for (const arg of argv.slice(1)) {
    if (!removeSource && (arg === "-r" || arg === "-R")) recursive = true;
    else if (arg.startsWith("-") && arg !== "-") return fail(`${command}: invalid option -- '${arg.replace(/^-/, "")}'`);
    else args.push(arg);
  }
  if (args.length < 2) return fail(`${command}: missing file operand`);
  const dest = args[args.length - 1];
  const sources = args.slice(0, -1);
  const destAbs = resolve(io, dest);
  let destIsDir = false;
  try {
    destIsDir = io.vfs.stat(destAbs).type === "dir";
  } catch (error) {
    if (!(error instanceof FsError && error.code === "ENOENT") || sources.length > 1) {
      return fail(explain(command, error).replace(/\n$/, ""));
    }
  }

  const errors: string[] = [];
  for (const source of sources) {
    const srcAbs = resolve(io, source);
    const target = destIsDir ? `${destAbs.replace(/\/$/, "")}/${srcAbs.split("/").pop()}` : destAbs;
    try {
      if (target === srcAbs || target.startsWith(`${srcAbs}/`)) {
        throw new Error(`${command}: '${source}' and '${dest}' are the same file`);
      }
      copyPath(io, srcAbs, target, recursive);
      if (removeSource) io.vfs.rm(srcAbs, { recursive: true, force: false });
    } catch (error) {
      errors.push(explain(command, error).replace(/\n$/, ""));
    }
  }
  if (errors.length) return fail(errors.join("\n"));
  return ok();
}

function copyPath(io: Io, srcAbs: string, destAbs: string, recursive: boolean): void {
  const src = io.vfs.stat(srcAbs);
  if (src.type === "dir") {
    if (!recursive) throw new FsError("EISDIR", srcAbs);
    io.vfs.mkdir(destAbs, true);
    for (const name of io.vfs.readdir(srcAbs)) {
      copyPath(io, `${srcAbs}/${name}`, `${destAbs}/${name}`, true);
    }
    return;
  }
  io.vfs.writeFile(destAbs, io.vfs.readFile(srcAbs));
  try {
    io.vfs.chmod(destAbs, src.mode);
  } catch {
    // Copied content is enough if the new owner cannot chmod. They own the new file, so this is rare.
  }
}

function readFiles(
  argv: string[],
  io: Io,
  command: string,
  format: (text: string, path: string) => string,
): CmdResult {
  const paths = argv.slice(1).filter((arg) => arg !== "--");
  if (paths.some((arg) => arg.startsWith("-") && arg !== "-")) {
    return fail(`${command}: invalid option -- '${paths.find((arg) => arg.startsWith("-"))}'`);
  }
  if (paths.length === 0) {
    if (!io.stdin) {
      return fail(`${command}: no input. Pass a file, or pipe another command.`);
    }
    return ok(format(io.stdin, ""));
  }
  let stdout = "";
  for (const path of paths) {
    try {
      const text = readArg(io, path);
      const normalised = text.endsWith("\n") || text === "" ? text : `${text}\n`;
      stdout += format(normalised, path);
    } catch (error) {
      return { stdout, stderr: explain(command, error), code: 1 };
    }
  }
  return ok(stdout);
}

function sliceFile(argv: string[], io: Io, command: "head" | "tail", edge: "start" | "end"): CmdResult {
  let count = 10;
  const files: string[] = [];
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "-n") {
      const value = argv[++index];
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed < 0) return fail(`${command}: invalid number of lines: '${value ?? ""}'`);
      count = parsed;
      continue;
    }
    if (/^-n\d+$/.test(arg)) {
      count = Number(arg.slice(2));
      continue;
    }
    if (/^-\d+$/.test(arg)) {
      count = Number(arg.slice(1));
      continue;
    }
    if (arg === "--") {
      files.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("-")) return fail(`${command}: invalid option -- '${arg.replace(/^-/, "")}'`);
    files.push(arg);
  }

  const take = (text: string) => {
    const lines = splitLines(text);
    const chosen = edge === "start" ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count));
    return chosen.length ? `${chosen.join("\n")}\n` : "";
  };

  if (files.length === 0) {
    if (!io.stdin && io.isTty) return fail(`${command}: no input. Pass a file, or pipe another command.`);
    return ok(take(io.stdin));
  }

  let stdout = "";
  for (const path of files) {
    try {
      stdout += take(readArg(io, path));
    } catch (error) {
      return { stdout, stderr: explain(command, error), code: 1 };
    }
  }
  return ok(stdout);
}

function lessCommand(argv: string[], io: Io): CmdResult {
  const files = argv.slice(1).filter((arg) => !arg.startsWith("-"));
  if (argv.slice(1).some((arg) => arg.startsWith("-") && arg !== "-")) {
    return fail("less: this lab supports less FILE, without flags");
  }
  let text = "";
  if (files.length === 0) {
    if (!io.stdin) return fail("less: no input. Pass a file, or pipe another command.");
    text = io.stdin;
  } else {
    try {
      text = files.map((path) => readArg(io, path)).join("");
    } catch (error) {
      return fail(explain("less", error).replace(/\n$/, ""));
    }
  }
  const normalised = text.endsWith("\n") || text === "" ? text : `${text}\n`;
  if (!io.isTty) return ok(normalised);
  return { stdout: normalised, stderr: "", code: 0, pager: splitLines(normalised) };
}

function chmodCommand(argv: string[], io: Io): CmdResult {
  if (argv.length < 3) return fail("chmod: missing operand");
  const spec = argv[1];
  const errors: string[] = [];
  for (const path of argv.slice(2)) {
    try {
      const abs = resolve(io, path);
      const node = io.vfs.stat(abs);
      io.vfs.chmod(abs, applyMode(node.mode, spec));
    } catch (error) {
      errors.push(explain("chmod", error).replace(/\n$/, ""));
    }
  }
  if (errors.length) return fail(errors.join("\n"));
  return ok();
}

function chownCommand(argv: string[], io: Io): CmdResult {
  if (argv.length < 3) return fail("chown: missing operand");
  const spec = argv[1];
  let user: string | null = null;
  let group: string | null = null;
  if (spec.includes(":")) {
    const [left, right] = spec.split(":");
    user = left || null;
    group = right || null;
  } else {
    user = spec;
  }
  const identity = user ? IDENTITIES[user] : null;
  if (user && !identity) return fail(`chown: invalid user: '${user}'`);
  if (group && GROUP_IDS[group] === undefined) return fail(`chown: invalid group: '${group}'`);
  const errors: string[] = [];
  for (const path of argv.slice(2)) {
    try {
      io.vfs.chown(resolve(io, path), identity ? identity.uid : null, group ? GROUP_IDS[group] : null);
    } catch (error) {
      errors.push(explain("chown", error).replace(/\n$/, ""));
    }
  }
  if (errors.length) return fail(errors.join("\n"));
  return ok();
}

function echoCommand(argv: string[]): CmdResult {
  let newline = true;
  let args = argv.slice(1);
  if (args[0] === "-n") {
    newline = false;
    args = args.slice(1);
  }
  return ok(`${args.join(" ")}${newline ? "\n" : ""}`);
}

function wcCommand(argv: string[], io: Io): CmdResult {
  const parsed = flagsAndPaths(argv, "lwc");
  if (parsed.error) return fail(parsed.error);
  const showLine = parsed.flags.has("l") || parsed.flags.size === 0;
  const showWord = parsed.flags.has("w") || parsed.flags.size === 0;
  const showByte = parsed.flags.has("c") || parsed.flags.size === 0;
  const files = parsed.paths;
  const chunks: Array<{ label: string; text: string }> = [];
  if (files.length === 0) chunks.push({ label: "", text: io.stdin });
  for (const path of files) {
    try {
      chunks.push({ label: path, text: readArg(io, path) });
    } catch (error) {
      return fail(explain("wc", error).replace(/\n$/, ""));
    }
  }
  const lines = chunks.map((chunk) => {
    const counts = countText(chunk.text);
    const cols = [
      showLine ? String(counts.lines).padStart(7) : "",
      showWord ? String(counts.words).padStart(7) : "",
      showByte ? String(counts.bytes).padStart(7) : "",
      chunk.label ? ` ${chunk.label}` : "",
    ];
    return cols.join("").trimEnd();
  });
  return ok(`${lines.join("\n")}\n`);
}

function countText(text: string): { lines: number; words: number; bytes: number } {
  const lines = text === "" ? 0 : splitLines(text).length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  return { lines, words, bytes: text.length };
}

function exportCommand(argv: string[], io: Io): CmdResult {
  if (argv.length === 1) {
    const lines = Object.entries(io.env)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => `declare -x ${key}="${value}"`);
    return ok(`${lines.join("\n")}\n`);
  }
  for (const arg of argv.slice(1)) {
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    const name = arg.slice(0, eq);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return fail(`bash: export: '${name}': not a valid identifier`);
    io.env[name] = arg.slice(eq + 1);
  }
  return ok();
}

function grepCommand(argv: string[], io: Io): CmdResult {
  let ignore = false;
  let number = false;
  let invert = false;
  let count = false;
  let recursive = false;
  let filesOnly = false;
  let word = false;
  let extended = false;
  const rest: string[] = [];
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--") {
      rest.push(...argv.slice(index + 1));
      break;
    }
    if (arg === "--ignore-case") ignore = true;
    else if (arg === "--line-number") number = true;
    else if (arg === "--invert-match") invert = true;
    else if (arg === "--count") count = true;
    else if (arg === "--recursive") recursive = true;
    else if (arg === "--files-with-matches") filesOnly = true;
    else if (arg === "--word-regexp") word = true;
    else if (arg === "--extended-regexp") extended = true;
    else if (arg.startsWith("--")) return fail(`grep: unknown option '${arg}'`);
    else if (arg.startsWith("-") && arg !== "-") {
      for (const flag of arg.slice(1)) {
        if (flag === "i") ignore = true;
        else if (flag === "n") number = true;
        else if (flag === "v") invert = true;
        else if (flag === "c") count = true;
        else if (flag === "r" || flag === "R") recursive = true;
        else if (flag === "l") filesOnly = true;
        else if (flag === "w") word = true;
        else if (flag === "E") extended = true;
        else if (flag === "F") extended = false;
        else return fail(`grep: invalid option -- '${flag}'`);
      }
    } else rest.push(arg);
  }
  if (rest.length === 0) return fail("grep: missing pattern");
  const pattern = rest[0];
  const paths = rest.slice(1);
  let matcher: (line: string) => boolean;
  try {
    matcher = makeMatcher(pattern, { ignore, word, extended });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "grep: invalid pattern");
  }

  const files: Array<{ label: string; text: string }> = [];
  const errors: string[] = [];
  if (paths.length === 0) {
    if (!io.stdin && io.isTty) return fail("grep: no input file. Pass a path, or pipe another command.");
    files.push({ label: "", text: io.stdin });
  } else {
    for (const path of paths) {
      collectGrep(io, path, recursive, files, errors);
    }
  }
  if (files.length === 0 && errors.length) return fail(errors.join("\n"));

  const prefix = files.length > 1 || recursive;
  let stdout = "";
  for (const file of files) {
    const lines = splitLines(file.text);
    const hits: string[] = [];
    let matchedCount = 0;
    lines.forEach((line, index) => {
      const matched = matcher(line);
      if (matched === invert) return;
      matchedCount += 1;
      if (filesOnly || count) return;
      const bits: string[] = [];
      if (prefix && file.label) bits.push(file.label);
      if (number) bits.push(String(index + 1));
      bits.push(line);
      hits.push(bits.join(":"));
    });
    if (filesOnly) {
      if (matchedCount) stdout += `${file.label || "(standard input)"}\n`;
      continue;
    }
    if (count) {
      stdout += prefix && file.label ? `${file.label}:${matchedCount}\n` : `${matchedCount}\n`;
      continue;
    }
    if (hits.length) stdout += `${hits.join("\n")}\n`;
  }
  const stderr = errors.length ? `${errors.join("\n")}\n` : "";
  return { stdout, stderr, code: stdout ? 0 : errors.length ? 2 : 1 };
}

function collectGrep(
  io: Io,
  path: string,
  recursive: boolean,
  files: Array<{ label: string; text: string }>,
  errors: string[],
): void {
  const abs = resolve(io, path);
  let node;
  try {
    node = io.vfs.stat(abs);
  } catch (error) {
    errors.push(explain("grep", error).replace(/\n$/, ""));
    return;
  }
  if (node.type === "dir") {
    if (!recursive) {
      errors.push(`grep: ${path}: Is a directory`);
      return;
    }
    let names: string[] = [];
    try {
      names = io.vfs.readdir(abs);
    } catch (error) {
      errors.push(explain("grep", error).replace(/\n$/, ""));
      return;
    }
    for (const name of names) {
      collectGrep(io, `${path.replace(/\/$/, "")}/${name}`, true, files, errors);
    }
    return;
  }
  try {
    files.push({ label: path, text: io.vfs.readFile(abs) });
  } catch (error) {
    errors.push(explain("grep", error).replace(/\n$/, ""));
  }
}

function makeMatcher(
  pattern: string,
  opts: { ignore: boolean; word: boolean; extended: boolean },
): (line: string) => boolean {
  if (!opts.extended) {
    const needle = opts.ignore ? pattern.toLowerCase() : pattern;
    return (line) => {
      const hay = opts.ignore ? line.toLowerCase() : line;
      if (!opts.word) return hay.includes(needle);
      let from = 0;
      while (from <= hay.length) {
        const at = hay.indexOf(needle, from);
        if (at < 0) return false;
        const before = at === 0 || !/\w/.test(hay[at - 1] ?? "");
        const after = at + needle.length >= hay.length || !/\w/.test(hay[at + needle.length] ?? "");
        if (before && after) return true;
        from = at + 1;
      }
      return false;
    };
  }
  let expression: RegExp;
  try {
    expression = new RegExp(opts.word ? `\\b(?:${pattern})\\b` : pattern, opts.ignore ? "i" : "");
  } catch {
    throw new Error(`grep: invalid pattern '${pattern}'`);
  }
  return (line) => expression.test(line);
}

function findCommand(argv: string[], io: Io): CmdResult {
  const paths: string[] = [];
  let index = 1;
  while (index < argv.length && !argv[index].startsWith("-")) paths.push(argv[index++]);
  if (paths.length === 0) paths.push(".");

  let name: string | null = null;
  let insensitive = false;
  let type: "f" | "d" | null = null;
  let maxDepth: number | null = null;
  let minDepth = 0;
  while (index < argv.length) {
    const arg = argv[index++];
    if (arg === "-name" || arg === "-iname") {
      const value = argv[index++];
      if (value === undefined) return fail(`find: missing argument to \`${arg}'`);
      name = value;
      insensitive = arg === "-iname";
    } else if (arg === "-type") {
      const value = argv[index++];
      if (value !== "f" && value !== "d") return fail(`find: unknown argument to -type: ${value ?? ""}`);
      type = value;
    } else if (arg === "-maxdepth" || arg === "-mindepth") {
      const value = Number(argv[index++]);
      if (!Number.isInteger(value) || value < 0) return fail(`find: invalid ${arg}`);
      if (arg === "-maxdepth") maxDepth = value;
      else minDepth = value;
    } else return fail(`find: unknown predicate \`${arg}'`);
  }

  const nameOk = (base: string) => {
    if (!name) return true;
    const pattern = insensitive ? name.toLowerCase() : name;
    const target = insensitive ? base.toLowerCase() : base;
    return globToRegExp(pattern).test(target);
  };

  let stdout = "";
  let stderr = "";
  const visit = (abs: string, display: string, depth: number) => {
    let node;
    try {
      node = io.vfs.stat(abs);
    } catch (error) {
      stderr += explain("find", error);
      return;
    }
    const base = abs === "/" ? "/" : abs.slice(abs.lastIndexOf("/") + 1);
    const typeOk = !type || (type === "f" ? node.type === "file" : node.type === "dir");
    if (depth >= minDepth && typeOk && nameOk(base)) stdout += `${display}\n`;
    if (node.type !== "dir") return;
    if (maxDepth !== null && depth >= maxDepth) return;
    let names: string[] = [];
    try {
      names = io.vfs.readdir(abs);
    } catch (error) {
      stderr += explain("find", error);
      return;
    }
    for (const child of names) {
      const childDisplay = display === "." ? `./${child}` : `${display.replace(/\/$/, "")}/${child}`;
      visit(`${abs === "/" ? "" : abs}/${child}`, childDisplay, depth + 1);
    }
  };

  for (const path of paths) {
    visit(resolve(io, path), path, 0);
  }
  return { stdout, stderr, code: stderr ? 1 : 0 };
}
