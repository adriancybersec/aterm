import type { PlanId } from "../plans";
import type { LabSeed } from "../shell/shell";

export type SandboxPreset = LabSeed & {
  id: string;
  name: string;
  summary: string;
  minPlan: PlanId;
};

export const sandboxPresets: SandboxPreset[] = [
  {
    id: "home",
    name: "Home directory",
    summary: "A quiet home folder for trying commands that are not in a lesson.",
    minPlan: "free",
    cwd: "/home/student",
    files: [
      {
        path: "/home/student/welcome.txt",
        content: "Practice folder. Nothing here is marked.\nTry ls, mkdir, and echo hello > notes.txt.\n",
      },
      {
        path: "/home/student/labs/readme.txt",
        content: "Lesson files are not loaded in the open sandbox.\n",
      },
    ],
  },
  {
    id: "logs",
    name: "Log shelf",
    summary: "A short application log and an auth log, for grep, head, and less.",
    minPlan: "plus",
    cwd: "/home/student",
    files: [
      {
        path: "/home/student/logs/app.log",
        content:
          "2026-10-26T09:00:01 INFO backup started\n2026-10-26T09:00:09 ERROR disk quota exceeded on /home\n2026-10-26T09:00:11 WARN retrying copy in 30 seconds\n2026-10-26T09:05:02 INFO backup finished\n",
      },
      {
        path: "/home/student/logs/auth.log",
        content:
          "Oct 26 08:01:02 lab-01 sshd[1201]: Accepted publickey for student from 10.0.0.14 port 51402 ssh2\nOct 26 09:02:18 lab-01 sshd[1402]: Failed password for guest from 10.0.0.50 port 41888 ssh2\nOct 26 10:11:05 lab-01 sshd[1711]: pam_unix(sshd:session): session closed for user student\n",
      },
    ],
  },
  {
    id: "perms",
    name: "Permissions bench",
    summary: "A few files with different modes, so you can practise chmod and ls -l.",
    minPlan: "plus",
    cwd: "/home/student/lab",
    files: [
      {
        path: "/home/student/lab/secrets.txt",
        mode: "644",
        content: "Demo token: aterx-lab-demo-token\nTighten this with chmod 600.\n",
      },
      {
        path: "/home/student/lab/notes.txt",
        mode: "600",
        content: "Private note. chmod 644 if the group should read it.\n",
      },
      {
        path: "/home/student/lab/collect.sh",
        mode: "644",
        content: "#!/bin/bash\necho lab collect\n",
      },
    ],
  },
];

export const sandboxCheatSheet = [
  { command: "man ls", description: "Short page for a built-in command." },
  { command: "echo hi > notes.txt", description: "Write text into a file." },
  { command: "cat notes.txt", description: "Print it back." },
  { command: "ls -la", description: "Long list, including hidden names." },
];
