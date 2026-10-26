import { describe, expect, it } from "vitest";
import { LabShell, type GradeContext } from "../src/lib/shell/shell";

function session(files: { path: string; content?: string; mode?: string }[] = [], cwd = "/home/student") {
  const events: GradeContext[] = [];
  const screen: string[] = [];
  const shell = new LabShell({
    write: (data) => screen.push(data),
    seed: { cwd, files },
    onCommand: (event) => events.push(event),
  });
  shell.start();
  return {
    shell,
    events,
    screen: () => screen.join(""),
    run(line: string) {
      shell.input(`${line}\r`);
      const event = events[events.length - 1];
      if (!event) throw new Error(`no event for ${line}`);
      return event;
    },
  };
}

describe("lab shell", () => {
  it("prints the working directory and changes it", () => {
    const lab = session();
    expect(lab.run("pwd").stdout.trim()).toBe("/home/student");
    expect(lab.run("cd /tmp").cwd).toBe("/tmp");
    expect(lab.run("pwd").stdout.trim()).toBe("/tmp");
    expect(lab.run("cd -").stdout.trim()).toBe("/home/student");
  });

  it("lists hidden files and refuses unknown commands", () => {
    const lab = session();
    expect(lab.run("ls").stdout).not.toContain(".bashrc");
    expect(lab.run("ls -a").stdout).toContain(".bashrc");
    const missing = lab.run("curl https://example.com");
    expect(missing.exitCode).toBe(127);
    expect(missing.stderr).toContain("command not found");
  });

  it("pipes, redirects, and expands quotes", () => {
    const lab = session();
    expect(lab.run('echo "$HOME"').stdout.trim()).toBe("/home/student");
    expect(lab.run("echo '$HOME'").stdout.trim()).toBe("$HOME");
    const piped = lab.run("echo hello | grep ell");
    expect(piped.stdout.trim()).toBe("hello");
    lab.run("echo hello > notes.txt");
    expect(lab.run("cat notes.txt").stdout.trim()).toBe("hello");
    const file = lab.run("cat notes.txt").files.find((item) => item.path === "/home/student/notes.txt");
    expect(file?.content).toBe("hello\n");
  });

  it("applies permissions and keeps root intact", () => {
    const lab = session([{ path: "/home/student/secret.txt", content: "quiet\n", mode: "644" }]);
    expect(lab.run("chmod 000 secret.txt").exitCode).toBe(0);
    const denied = lab.run("cat secret.txt");
    expect(denied.exitCode).not.toBe(0);
    expect(denied.stderr.toLowerCase()).toContain("permission");
    const removed = lab.run("rm -rf /");
    expect(removed.exitCode).not.toBe(0);
    expect(removed.stderr).toContain("refusing");
    expect(removed.files.some((file) => file.path === "/home/student")).toBe(true);
  });

  it("does not run programs", () => {
    const lab = session([{ path: "/home/student/collect.sh", content: "echo nope\n", mode: "755" }]);
    const result = lab.run("./collect.sh");
    expect(result.exitCode).toBe(126);
    expect(result.stderr).toContain("does not run programs");
  });
});
