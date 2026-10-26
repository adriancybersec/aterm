export class ParseError extends Error {}

export type Part = { type: "lit"; text: string } | { type: "var"; name: string };

export type Word = {
  parts: Part[];
  canGlob: boolean;
};

export type Redir = {
  fd: number;
  append: boolean;
  target: Word;
};

export type SimpleCommand = {
  argv: Word[];
  redirects: Redir[];
};

export type Script = {
  pipelines: SimpleCommand[][];
  ops: Array<";" | "&&" | "||">;
};

type Token =
  | { kind: "word"; parts: Part[]; canGlob: boolean }
  | { kind: "op"; value: ";" | "&&" | "||" | "|" }
  | { kind: "redir"; fd: number; append: boolean };

function pushLit(parts: Part[], text: string) {
  if (text === "") return;
  const last = parts[parts.length - 1];
  if (last && last.type === "lit") last.text += text;
  else parts.push({ type: "lit", text });
}

export function parseLine(input: string): Script {
  const tokens = tokenize(input);
  if (tokens.length === 0) return { pipelines: [], ops: [] };

  const pipelines: SimpleCommand[][] = [];
  const ops: Array<";" | "&&" | "||"> = [];
  let pipeline: SimpleCommand[] = [];
  let command: SimpleCommand = { argv: [], redirects: [] };

  const hasCommand = () => command.argv.length > 0 || command.redirects.length > 0;

  const flushCommand = () => {
    if (!hasCommand()) {
      throw new ParseError("syntax error near unexpected token");
    }
    pipeline.push(command);
    command = { argv: [], redirects: [] };
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.kind === "op") {
      if (!hasCommand() && pipeline.length === 0) {
        throw new ParseError(`syntax error near unexpected token '${token.value}'`);
      }
      if (token.value === "|") {
        flushCommand();
        continue;
      }
      flushCommand();
      pipelines.push(pipeline);
      pipeline = [];
      ops.push(token.value);
      continue;
    }
    if (token.kind === "redir") {
      const next = tokens[++index];
      if (!next || next.kind !== "word") {
        throw new ParseError("syntax error: missing redirect target");
      }
      command.redirects.push({
        fd: token.fd,
        append: token.append,
        target: { parts: next.parts, canGlob: next.canGlob },
      });
      continue;
    }
    command.argv.push({ parts: token.parts, canGlob: token.canGlob });
  }

  if (hasCommand() || pipeline.length > 0) {
    flushCommand();
    pipelines.push(pipeline);
  }

  if (ops.length === pipelines.length && ops[ops.length - 1] === ";") {
    ops.pop();
  }
  if (ops.length !== pipelines.length - 1) {
    throw new ParseError("syntax error near unexpected token");
  }

  return { pipelines, ops };
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let expectAmpTarget = false;

  const readVar = (): Part => {
    index++;
    if (input[index] === "{") {
      index++;
      let name = "";
      while (index < input.length && input[index] !== "}") name += input[index++];
      if (input[index] !== "}") throw new ParseError("unclosed ${");
      index++;
      return { type: "var", name };
    }
    if (input[index] === "?") {
      index++;
      return { type: "var", name: "?" };
    }
    let name = "";
    while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) name += input[index++];
    if (!name) return { type: "lit", text: "$" };
    return { type: "var", name };
  };

  while (index < input.length) {
    const char = input[index];
    if (char === " " || char === "\t" || char === "\r") {
      index++;
      continue;
    }

    if (expectAmpTarget && char === "&") {
      index++;
      let num = "";
      while (index < input.length && /[0-9]/.test(input[index])) num += input[index++];
      if (!num) throw new ParseError("syntax error near &");
      tokens.push({ kind: "word", parts: [{ type: "lit", text: `&${num}` }], canGlob: false });
      expectAmpTarget = false;
      continue;
    }
    expectAmpTarget = false;

    if (char === "#") break;
    if (char === "\n") {
      tokens.push({ kind: "op", value: ";" });
      index++;
      continue;
    }
    if (char === ";") {
      tokens.push({ kind: "op", value: ";" });
      index++;
      continue;
    }
    if (char === "|" && input[index + 1] === "|") {
      tokens.push({ kind: "op", value: "||" });
      index += 2;
      continue;
    }
    if (char === "|") {
      tokens.push({ kind: "op", value: "|" });
      index++;
      continue;
    }
    if (char === "&" && input[index + 1] === "&") {
      tokens.push({ kind: "op", value: "&&" });
      index += 2;
      continue;
    }
    if (char === "&") {
      throw new ParseError("background jobs are not available in this lab");
    }
    if (/[0-9]/.test(char) && input[index + 1] === ">") {
      const fd = Number(char);
      index += 2;
      const append = input[index] === ">";
      if (append) index++;
      tokens.push({ kind: "redir", fd, append });
      expectAmpTarget = true;
      continue;
    }
    if (char === ">" && input[index + 1] === ">") {
      tokens.push({ kind: "redir", fd: 1, append: true });
      index += 2;
      expectAmpTarget = true;
      continue;
    }
    if (char === ">") {
      tokens.push({ kind: "redir", fd: 1, append: false });
      index++;
      expectAmpTarget = true;
      continue;
    }
    if (char === "<") {
      tokens.push({ kind: "redir", fd: 0, append: false });
      index++;
      expectAmpTarget = true;
      continue;
    }

    const parts: Part[] = [];
    let canGlob = false;
    let saw = false;
    while (index < input.length) {
      const current = input[index];
      if (" \t\n\r;|<>".includes(current) || current === "&") break;
      if (current === "'") {
        index++;
        let literal = "";
        while (index < input.length && input[index] !== "'") literal += input[index++];
        if (input[index] !== "'") throw new ParseError("unclosed quote");
        index++;
        pushLit(parts, literal);
        saw = true;
        continue;
      }
      if (current === '"') {
        index++;
        while (index < input.length && input[index] !== '"') {
          if (input[index] === "\\" && "\"\\$`".includes(input[index + 1] ?? "")) {
            pushLit(parts, input[index + 1] ?? "");
            index += 2;
            continue;
          }
          if (input[index] === "$") {
            parts.push(readVar());
            continue;
          }
          pushLit(parts, input[index]);
          index++;
        }
        if (input[index] !== '"') throw new ParseError("unclosed quote");
        index++;
        saw = true;
        continue;
      }
      if (current === "\\") {
        index++;
        if (index < input.length) pushLit(parts, input[index++]);
        saw = true;
        continue;
      }
      if (current === "$") {
        parts.push(readVar());
        saw = true;
        continue;
      }
      if (current === "*" || current === "?") canGlob = true;
      pushLit(parts, current);
      index++;
      saw = true;
    }
    if (!saw && parts.length === 0) {
      throw new ParseError("syntax error");
    }
    if (parts.length === 0) parts.push({ type: "lit", text: "" });
    tokens.push({ kind: "word", parts, canGlob });
  }

  return tokens;
}

export function expandWord(
  word: Word,
  env: Record<string, string>,
  status: number,
): string {
  let text = "";
  for (const part of word.parts) {
    if (part.type === "lit") text += part.text;
    else if (part.name === "?") text += String(status);
    else text += env[part.name] ?? "";
  }
  return text;
}
