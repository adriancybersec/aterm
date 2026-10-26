import { SEED_TIME, globToRegExp, groupName, userName } from "./format";

export type FsNode = {
  type: "file" | "dir";
  mode: number;
  uid: number;
  gid: number;
  mtime: number;
  content: string;
  children: Map<string, FsNode>;
};

export type SnapshotFile = {
  path: string;
  type: "file" | "dir";
  mode: number;
  owner: string;
  group: string;
  content: string;
};

export type Identity = {
  name: string;
  uid: number;
  gid: number;
  home: string;
  groups: number[];
};

export const IDENTITIES: Record<string, Identity> = {
  root: { name: "root", uid: 0, gid: 0, home: "/root", groups: [0] },
  student: {
    name: "student",
    uid: 1000,
    gid: 1000,
    home: "/home/student",
    groups: [1000, 1001],
  },
  lab: { name: "lab", uid: 1001, gid: 1001, home: "/home/lab", groups: [1001] },
};

export const GROUP_IDS: Record<string, number> = {
  root: 0,
  student: 1000,
  lab: 1001,
};

export class FsError extends Error {
  constructor(
    public code:
      | "ENOENT"
      | "EACCES"
      | "EEXIST"
      | "ENOTDIR"
      | "EISDIR"
      | "ENOTEMPTY"
      | "EINVAL",
    public path: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export type SeedFile = {
  path: string;
  content?: string;
  mode?: string;
  owner?: string;
  group?: string;
  type?: "file" | "dir";
};

function makeDir(partial: {
  mode: number;
  uid: number;
  gid: number;
  mtime?: number;
}): FsNode {
  return {
    type: "dir",
    mode: partial.mode,
    uid: partial.uid,
    gid: partial.gid,
    mtime: partial.mtime ?? SEED_TIME,
    content: "",
    children: new Map(),
  };
}

function makeFile(partial: {
  mode: number;
  uid: number;
  gid: number;
  content: string;
  mtime?: number;
}): FsNode {
  return {
    type: "file",
    mode: partial.mode,
    uid: partial.uid,
    gid: partial.gid,
    mtime: partial.mtime ?? SEED_TIME,
    content: partial.content,
    children: new Map(),
  };
}

function dirname(path: string): string {
  if (path === "/") return "/";
  const cut = path.lastIndexOf("/");
  return cut <= 0 ? "/" : path.slice(0, cut);
}

function basename(path: string): string {
  if (path === "/") return "/";
  const cut = path.lastIndexOf("/");
  return path.slice(cut + 1);
}

export class Vfs {
  readonly root: FsNode;
  user: Identity;

  constructor(user: Identity = IDENTITIES.student) {
    this.user = user;
    this.root = makeDir({ mode: 0o755, uid: 0, gid: 0 });
  }

  can(node: FsNode, bit: "r" | "w" | "x", user: Identity = this.user): boolean {
    if (user.uid === 0) return true;
    const shift = node.uid === user.uid ? 6 : user.groups.includes(node.gid) ? 3 : 0;
    const flag = bit === "r" ? 4 : bit === "w" ? 2 : 1;
    return ((node.mode >> shift) & flag) !== 0;
  }

  resolve(cwd: string, input: string): string {
    let path = input;
    if (path === "~" || path.startsWith("~/")) {
      path = this.user.home + path.slice(1);
    }
    if (!path.startsWith("/")) {
      path = `${cwd.replace(/\/$/, "")}/${path}`;
    }
    const parts: string[] = [];
    for (const part of path.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return `/${parts.join("/")}`;
  }

  private walk(
    abs: string,
    opts?: { forCreate?: boolean },
  ): { node: FsNode | null; parent: FsNode | null; name: string } {
    const parts = abs.split("/").filter(Boolean);
    let node = this.root;
    if (parts.length === 0) return { node, parent: null, name: "" };

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const last = index === parts.length - 1;
      if (node.type !== "dir") {
        throw new FsError("ENOTDIR", abs);
      }
      if (!this.can(node, "x")) {
        throw new FsError("EACCES", `/${parts.slice(0, index).join("/")}` || "/");
      }
      const child = node.children.get(part) ?? null;
      if (!child) {
        if (last && opts?.forCreate) return { node: null, parent: node, name: part };
        throw new FsError("ENOENT", abs);
      }
      if (last) return { node: child, parent: node, name: part };
      node = child;
    }
    throw new FsError("ENOENT", abs);
  }

  stat(abs: string): FsNode {
    const found = this.walk(abs).node;
    if (!found) throw new FsError("ENOENT", abs);
    return found;
  }

  assertExecutableDir(abs: string): FsNode {
    const node = this.stat(abs);
    if (node.type !== "dir") throw new FsError("ENOTDIR", abs);
    if (!this.can(node, "x")) throw new FsError("EACCES", abs);
    return node;
  }

  readdir(abs: string): string[] {
    const node = this.stat(abs);
    if (node.type !== "dir") throw new FsError("ENOTDIR", abs);
    if (!this.can(node, "r") || !this.can(node, "x")) throw new FsError("EACCES", abs);
    return [...node.children.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  readFile(abs: string): string {
    if (abs === "/dev/null") return "";
    const node = this.stat(abs);
    if (node.type === "dir") throw new FsError("EISDIR", abs);
    if (!this.can(node, "r")) throw new FsError("EACCES", abs);
    return node.content;
  }

  writeFile(abs: string, data: string, opts: { append?: boolean } = {}): void {
    if (abs === "/dev/null") return;
    const { node, parent, name } = this.walk(abs, { forCreate: true });
    if (!parent || !name) throw new FsError("EACCES", abs);
    if (!node) {
      if (!this.can(parent, "w")) throw new FsError("EACCES", abs);
      parent.children.set(
        name,
        makeFile({
          mode: 0o644,
          uid: this.user.uid,
          gid: this.user.gid,
          content: data,
          mtime: Date.now(),
        }),
      );
      parent.mtime = Date.now();
      return;
    }
    if (node.type === "dir") throw new FsError("EISDIR", abs);
    if (!this.can(node, "w")) throw new FsError("EACCES", abs);
    node.content = opts.append ? node.content + data : data;
    node.mtime = Date.now();
  }

  mkdir(abs: string, parents: boolean): void {
    const parts = abs.split("/").filter(Boolean);
    if (parts.length === 0) throw new FsError("EEXIST", "/");
    let node = this.root;
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const last = index === parts.length - 1;
      const built = `/${parts.slice(0, index + 1).join("/")}`;
      if (node.type !== "dir") throw new FsError("ENOTDIR", built);
      if (!this.can(node, "x")) throw new FsError("EACCES", built);
      const child = node.children.get(part);
      if (!child) {
        if (!last && !parents) throw new FsError("ENOENT", abs);
        if (!this.can(node, "w")) throw new FsError("EACCES", built);
        const created = makeDir({
          mode: 0o755,
          uid: this.user.uid,
          gid: this.user.gid,
          mtime: Date.now(),
        });
        node.children.set(part, created);
        node.mtime = Date.now();
        node = created;
        continue;
      }
      if (child.type !== "dir") throw new FsError("ENOTDIR", built);
      if (last && !parents) throw new FsError("EEXIST", abs);
      node = child;
    }
  }

  rm(abs: string, opts: { recursive: boolean; force: boolean }): void {
    if (abs === "/") {
      throw new FsError("EINVAL", abs, "refusing to remove '/'");
    }
    let found: { node: FsNode | null; parent: FsNode | null; name: string };
    try {
      found = this.walk(abs);
    } catch (error) {
      if (opts.force && error instanceof FsError && error.code === "ENOENT") return;
      throw error;
    }
    const { node, parent, name } = found;
    if (!node || !parent) throw new FsError("EINVAL", abs);
    if (!this.can(parent, "w") || !this.can(parent, "x")) throw new FsError("EACCES", abs);
    if (node.type === "dir") {
      if (!opts.recursive) throw new FsError("EISDIR", abs);
      this.clearTree(node, abs);
    }
    parent.children.delete(name);
    parent.mtime = Date.now();
  }

  private clearTree(node: FsNode, path: string): void {
    if (node.type !== "dir") return;
    if (!this.can(node, "r") || !this.can(node, "w") || !this.can(node, "x")) {
      throw new FsError("EACCES", path);
    }
    for (const [name, child] of [...node.children.entries()]) {
      if (child.type === "dir") this.clearTree(child, `${path}/${name}`);
      node.children.delete(name);
    }
  }

  rmdir(abs: string): void {
    if (abs === "/") throw new FsError("EINVAL", abs, "refusing to remove '/'");
    const { node, parent, name } = this.walk(abs);
    if (!node || !parent) throw new FsError("ENOENT", abs);
    if (node.type !== "dir") throw new FsError("ENOTDIR", abs);
    if (node.children.size > 0) throw new FsError("ENOTEMPTY", abs);
    if (!this.can(parent, "w") || !this.can(parent, "x")) throw new FsError("EACCES", abs);
    parent.children.delete(name);
    parent.mtime = Date.now();
  }

  chmod(abs: string, mode: number): void {
    const node = this.stat(abs);
    if (this.user.uid !== 0 && node.uid !== this.user.uid) throw new FsError("EACCES", abs);
    node.mode = mode & 0o777;
    node.mtime = Date.now();
  }

  chown(abs: string, uid: number | null, gid: number | null): void {
    const node = this.stat(abs);
    if (this.user.uid !== 0 && node.uid !== this.user.uid) throw new FsError("EACCES", abs);
    if (uid !== null) node.uid = uid;
    if (gid !== null) node.gid = gid;
    node.mtime = Date.now();
  }

  touch(abs: string): void {
    try {
      const node = this.stat(abs);
      if (node.type === "dir") {
        node.mtime = Date.now();
        return;
      }
      if (!this.can(node, "w") && node.uid !== this.user.uid && this.user.uid !== 0) {
        throw new FsError("EACCES", abs);
      }
      node.mtime = Date.now();
    } catch (error) {
      if (error instanceof FsError && error.code === "ENOENT") {
        this.writeFile(abs, "");
        return;
      }
      throw error;
    }
  }

  glob(cwd: string, pattern: string): string[] {
    const slash = pattern.lastIndexOf("/");
    const dirPart = slash === -1 ? "." : pattern.slice(0, slash) || "/";
    const base = slash === -1 ? pattern : pattern.slice(slash + 1);
    try {
      const dirAbs = this.resolve(cwd, dirPart);
      const names = this.readdir(dirAbs);
      const matcher = globToRegExp(base);
      const matches = names.filter((name) => {
        if (name.startsWith(".") && !base.startsWith(".")) return false;
        return matcher.test(name);
      });
      if (matches.length === 0) return [pattern];
      return matches.map((name) =>
        slash === -1 ? name : `${dirPart.replace(/\/$/, "")}/${name}`,
      );
    } catch {
      return [pattern];
    }
  }

  snapshot(): SnapshotFile[] {
    const files: SnapshotFile[] = [];
    const walk = (node: FsNode, path: string) => {
      if (path !== "") {
        files.push({
          path,
          type: node.type,
          mode: node.mode & 0o777,
          owner: userName(node.uid),
          group: groupName(node.gid),
          content: node.type === "file" ? node.content : "",
        });
      }
      if (node.type === "dir") {
        for (const name of [...node.children.keys()].sort()) {
          const child = node.children.get(name)!;
          walk(child, path === "" ? `/${name}` : `${path}/${name}`);
        }
      }
    };
    walk(this.root, "");
    return files;
  }

  /** Seed-time insert. Bypasses permission checks and stamps the requested owner. */
  seed(file: SeedFile): void {
    const owner = IDENTITIES[file.owner ?? "student"] ?? IDENTITIES.student;
    const gid = file.group ? (GROUP_IDS[file.group] ?? owner.gid) : owner.gid;
    const mode = file.mode ? parseInt(file.mode, 8) & 0o777 : file.type === "dir" ? 0o755 : 0o644;
    const abs = this.resolve("/", file.path);
    if (file.type === "dir") {
      this.ensureDir(abs, owner.uid, gid, mode);
      return;
    }
    const parent = this.ensureDir(dirname(abs), owner.uid, gid, 0o755);
    parent.children.set(
      basename(abs),
      makeFile({
        mode,
        uid: owner.uid,
        gid,
        content: file.content ?? "",
        mtime: SEED_TIME,
      }),
    );
  }

  private ensureDir(abs: string, uid: number, gid: number, mode: number): FsNode {
    const parts = abs.split("/").filter(Boolean);
    let node = this.root;
    let built = "";
    for (const part of parts) {
      built += `/${part}`;
      let child = node.children.get(part);
      if (!child) {
        child = makeDir({ mode: 0o755, uid, gid, mtime: SEED_TIME });
        node.children.set(part, child);
      }
      if (child.type !== "dir") {
        throw new Error(`Cannot seed a directory over a file at ${built}`);
      }
      node = child;
    }
    if (abs !== "/") {
      node.mode = mode;
      node.uid = uid;
      node.gid = gid;
    }
    return node;
  }
}

export function createLabVfs(files: SeedFile[]): Vfs {
  const vfs = new Vfs(IDENTITIES.root);
  const base: SeedFile[] = [
    { path: "/home", type: "dir", owner: "root", mode: "755" },
    { path: "/home/student", type: "dir", owner: "student", mode: "755" },
    { path: "/home/lab", type: "dir", owner: "lab", mode: "755" },
    { path: "/root", type: "dir", owner: "root", mode: "755" },
    { path: "/tmp", type: "dir", owner: "root", mode: "777" },
    { path: "/etc", type: "dir", owner: "root", mode: "755" },
    { path: "/dev", type: "dir", owner: "root", mode: "755" },
    {
      path: "/etc/passwd",
      owner: "root",
      mode: "644",
      content:
        "root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/bash\nlab:x:1001:1001:Lab:/home/lab:/bin/bash\n",
    },
    {
      path: "/etc/group",
      owner: "root",
      mode: "644",
      content: "root:x:0:\nstudent:x:1000:\nlab:x:1001:student\n",
    },
    { path: "/etc/hostname", owner: "root", mode: "644", content: "aterx-lab\n" },
    {
      path: "/etc/os-release",
      owner: "root",
      mode: "644",
      content: 'NAME="Aterx Lab"\nID=aterx\nPRETTY_NAME="Aterx virtual lab"\n',
    },
    {
      path: "/root/readme.txt",
      owner: "root",
      mode: "644",
      content:
        "This is root's home directory. It is empty on purpose.\nAterx has no prize for poking around.\n",
    },
    {
      path: "/home/student/.bashrc",
      owner: "student",
      mode: "644",
      content:
        "# Aterx lab profile\n# This shell is virtual. It does not run commands on your computer.\n",
    },
    {
      path: "/dev/null",
      owner: "root",
      mode: "666",
      content: "",
    },
  ];
  for (const file of base) vfs.seed(file);
  for (const file of files) vfs.seed(file);
  vfs.user = IDENTITIES.student;
  return vfs;
}
