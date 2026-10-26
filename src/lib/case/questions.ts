export type CaseTaskId =
  | "find-access"
  | "find-visits"
  | "find-mail"
  | "odd-ip"
  | "first-page"
  | "miss-count"
  | "last-page"
  | "odd-site"
  | "opener"
  | "first-open"
  | "odd-count"
  | "mail-ip"
  | "mail-count"
  | "mail-site"
  | "downloader"
  | "sign-in"
  | "contact-ip"
  | "home-count"
  | "finding";

export type AnswerTaskId = Exclude<CaseTaskId, "find-access" | "find-visits" | "find-mail" | "finding">;

export type AnswerKey = AnswerTaskId;

export type TaskCheck =
  | { kind: "find"; name: string }
  | { kind: "exact"; file: string; key: AnswerKey; wrong: string }
  | { kind: "one-of"; file: string; wrong: string }
  | { kind: "finding" };

export type CaseTask = {
  id: CaseTaskId;
  prompt: string;
  hints: string[];
  marked: string;
  check: TaskCheck;
};

const findAccess: CaseTask = {
  id: "find-access",
  prompt: "Find the log of what people did on the office website. Use find so the path of access.log shows on screen.",
  hints: ["The file is named access.log.", "find looks through folders. A dot means start here.", "Type find . -name access.log"],
  marked: "website log",
  check: { kind: "find", name: "access.log" },
};

const findVisits: CaseTask = {
  id: "find-visits",
  prompt: "Find the log of other websites people opened. Use find so the path of sites.log shows on screen.",
  hints: ["The file is named sites.log. It is not the office website log.", "Type find . -name sites.log"],
  marked: "visits log",
  check: { kind: "find", name: "sites.log" },
};

const findMail: CaseTask = {
  id: "find-mail",
  prompt: "Find the mail log. Use find so the path of sent.log shows on screen.",
  hints: ["The file is named sent.log.", "Type find . -name sent.log"],
  marked: "mail log",
  check: { kind: "find", name: "sent.log" },
};

function exact(id: AnswerTaskId, prompt: string, hints: string[], marked: string, file: string, wrong: string): CaseTask {
  return { id, prompt, hints, marked, check: { kind: "exact", file, key: id, wrong } };
}

const TASKS: Record<AnswerTaskId, CaseTask> = {
  "odd-ip": exact(
    "odd-ip",
    "One IP tried pages that are not real. The others did not. Write only that IP in answers/odd-ip.txt.",
    ["In web/access.log, odd lines say not found.", 'Type grep "not found" web/access.log', "Save it with echo THE-IP > answers/odd-ip.txt"],
    "odd IP",
    "answers/odd-ip.txt",
    "odd-ip.txt is not the right IP",
  ),
  "first-page": exact(
    "first-page",
    "What was the first page name that was not found? It starts with a slash. Write only that name in answers/page.txt.",
    ["Look at the first not found line in web/access.log.", "The page name is the bit that starts with /.", "Save it with echo /page-name > answers/page.txt"],
    "page name",
    "answers/page.txt",
    "page.txt is not the right page",
  ),
  "miss-count": exact(
    "miss-count",
    "How many lines in the office website log say not found? Write only the number in answers/miss.txt.",
    ['grep can count. Type grep -c "not found" web/access.log', "Save that number with echo NUMBER > answers/miss.txt"],
    "miss count",
    "answers/miss.txt",
    "miss.txt is not the right number",
  ),
  "last-page": exact(
    "last-page",
    "What was the last page name that was not found? It starts with a slash. Write only that name in answers/last.txt.",
    ["Look at the last not found line in web/access.log.", "The page name starts with /.", "Save it with echo /page-name > answers/last.txt"],
    "last page",
    "answers/last.txt",
    "last.txt is not the right page",
  ),
  "odd-site": exact(
    "odd-site",
    "One website in the visits log is not on the allow.txt list. Write only that website in answers/site.txt.",
    ["Type cat allow.txt and then cat visits/sites.log.", "The odd name is in the log and missing from the list.", "Save it with echo the-website > answers/site.txt"],
    "website",
    "answers/site.txt",
    "site.txt is not the right website",
  ),
  opener: exact(
    "opener",
    "Which IP opened the website that is not on allow.txt? Write only that IP in answers/opener.txt.",
    ["Find the website that is in visits/sites.log and missing from allow.txt.", "Type grep that-website visits/sites.log", "Save the IP with echo THE-IP > answers/opener.txt"],
    "opener",
    "answers/opener.txt",
    "opener.txt is not the right IP",
  ),
  "first-open": exact(
    "first-open",
    "What time was the website that is not on allow.txt first opened? Write it like 09:00 in answers/time.txt.",
    ["Find that website in visits/sites.log.", "The time is at the start of the first matching line.", "Save it with echo 09:00 > answers/time.txt"],
    "time",
    "answers/time.txt",
    "time.txt is not the right time",
  ),
  "odd-count": exact(
    "odd-count",
    "How many times was the website that is not on allow.txt opened? Write only the number in answers/opens.txt.",
    ["Find that website in visits/sites.log.", 'Type grep -c the-website visits/sites.log', "Save the number with echo NUMBER > answers/opens.txt"],
    "open count",
    "answers/opens.txt",
    "opens.txt is not the right number",
  ),
  "mail-ip": exact(
    "mail-ip",
    "Who sent the first mail to team@brightwater.example? Write only that IP in answers/mail-ip.txt.",
    ["Open mail/sent.log. Each line is a time, an IP, and who they mailed.", "Type grep brightwater.example mail/sent.log", "Use the IP on the first matching line. echo THE-IP > answers/mail-ip.txt"],
    "mail IP",
    "answers/mail-ip.txt",
    "mail-ip.txt is not the right IP",
  ),
  "mail-count": exact(
    "mail-count",
    "How many lines are in the mail log? Write only the number in answers/mail-count.txt.",
    ["Type wc -l mail/sent.log", "Or count the lines yourself.", "echo NUMBER > answers/mail-count.txt"],
    "mail count",
    "answers/mail-count.txt",
    "mail-count.txt is not the right number",
  ),
  "mail-site": {
    id: "mail-site",
    prompt: "The mail log names other websites after team@. Write one of those that is also on allow.txt, not the office site, in answers/mail-site.txt.",
    hints: ["A mail line looks like sent mail to team@some-website.", "Skip brightwater.example. Check the other names against allow.txt.", "echo the-website > answers/mail-site.txt"],
    marked: "mailed website",
    check: { kind: "one-of", file: "answers/mail-site.txt", wrong: "mail-site.txt is not a website from the mail log" },
  },
  downloader: exact(
    "downloader",
    "Who downloaded the price list first? Write only that IP in answers/download.txt.",
    ["Type grep downloaded web/access.log", "Use the IP on the first line.", "echo THE-IP > answers/download.txt"],
    "download",
    "answers/download.txt",
    "download.txt is not the right IP",
  ),
  "sign-in": exact(
    "sign-in",
    "Who signed in first? Write only that IP in answers/signin.txt.",
    ['Type grep "signed in" web/access.log', "Use the IP on the first line.", "echo THE-IP > answers/signin.txt"],
    "sign in",
    "answers/signin.txt",
    "signin.txt is not the right IP",
  ),
  "contact-ip": exact(
    "contact-ip",
    "Who opened the contact page first? Write only that IP in answers/contact.txt.",
    ['Type grep "contact page" web/access.log', "Use the IP on the first line.", "echo THE-IP > answers/contact.txt"],
    "contact",
    "answers/contact.txt",
    "contact.txt is not the right IP",
  ),
  "home-count": exact(
    "home-count",
    "How many lines say the home page was opened? Write only the number in answers/home.txt.",
    ['Type grep -c "home page" web/access.log', "Save that number with echo NUMBER > answers/home.txt"],
    "home count",
    "answers/home.txt",
    "home.txt is not the right number",
  ),
};

export const QUESTION_GROUPS: AnswerTaskId[][] = [
  ["odd-ip", "first-page", "miss-count", "last-page"],
  ["odd-site", "opener", "first-open", "odd-count"],
  ["mail-ip", "mail-count", "mail-site"],
  ["downloader", "sign-in", "contact-ip", "home-count"],
];

const NAMES: Record<AnswerTaskId, string> = {
  "odd-ip": "the IP that tried pages that are not real",
  "first-page": "the first page that was not found",
  "miss-count": "how many pages were not found",
  "last-page": "the last page that was not found",
  "odd-site": "the website that is not allowed",
  opener: "the IP that opened the website that is not allowed",
  "first-open": "the time that website was first opened",
  "odd-count": "how many times that website was opened",
  "mail-ip": "the IP that sent the first office mail",
  "mail-count": "how many mail lines there are",
  "mail-site": "one other website from the mail log",
  downloader: "the IP that downloaded the price list",
  "sign-in": "the IP that signed in first",
  "contact-ip": "the IP that opened the contact page first",
  "home-count": "how many times the home page was opened",
};

export function questionGroup(id: string): number {
  return QUESTION_GROUPS.findIndex((group) => group.includes(id as AnswerTaskId));
}

export function findingName(id: AnswerTaskId): string {
  return NAMES[id];
}

function listNames(questions: readonly AnswerTaskId[]): string {
  const names = questions.map((id) => NAMES[id]);
  if (names.length <= 1) return names[0] ?? "what you found";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function findingTask(questions: readonly AnswerTaskId[]): CaseTask {
  return {
    id: "finding",
    prompt: `Write a finding in Report. Name ${listNames(questions)}, and what you would tell the office.`,
    hints: ["Open Report. On a phone it is the Report tab.", "Put each answer from the steps above in the note.", "Say what you would tell the office. Two sentences is enough."],
    marked: "finding",
    check: { kind: "finding" },
  };
}

function findTask(id: AnswerTaskId): CaseTask {
  const group = questionGroup(id);
  if (group === 1) return findVisits;
  if (group === 2) return findMail;
  return findAccess;
}

export function tasksForIds(questions: readonly AnswerTaskId[]): CaseTask[] {
  const first = questions[0];
  return [first ? findTask(first) : findAccess, ...questions.map((id) => TASKS[id]), findingTask(questions)];
}

export function allQuestionPicks(): AnswerTaskId[][] {
  const picks: AnswerTaskId[][] = [];
  for (let drop = 0; drop < QUESTION_GROUPS.length; drop += 1) {
    const groups = QUESTION_GROUPS.filter((_, index) => index !== drop);
    const walk = (index: number, acc: AnswerTaskId[]) => {
      if (index === groups.length) {
        picks.push([...acc]);
        return;
      }
      for (const id of groups[index] ?? []) walk(index + 1, [...acc, id]);
    };
    walk(0, []);
  }
  return picks;
}

function questionKey(ids: readonly string[]): string {
  return [...ids].sort().join(",");
}

export function pickQuestions(rng: () => number, avoid?: readonly string[]): AnswerTaskId[] {
  const avoidKey = avoid ? questionKey(avoid) : "";
  let picked: AnswerTaskId[] = ["odd-ip", "odd-site", "mail-ip"];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const groups = QUESTION_GROUPS.map((group) => [...group]);
    groups.splice(Math.floor(rng() * groups.length), 1);
    const chosen = groups.map((group) => group[Math.floor(rng() * group.length)] ?? group[0]);
    for (let index = chosen.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      const current = chosen[index];
      chosen[index] = chosen[swap];
      chosen[swap] = current;
    }
    picked = chosen;
    if (questionKey(chosen) !== avoidKey) return chosen;
  }
  return picked;
}
