export type QuestionSetId = "missing-pages" | "odd-website" | "mail-day" | "office-day";

export type CaseTaskId =
  | "find-access"
  | "find-visits"
  | "find-mail"
  | "odd-ip"
  | "odd-site"
  | "opener"
  | "first-page"
  | "miss-count"
  | "first-open"
  | "mail-ip"
  | "mail-count"
  | "mail-site"
  | "downloader"
  | "sign-in"
  | "finding";

export type AnswerKey =
  | "odd-ip"
  | "odd-site"
  | "opener"
  | "first-page"
  | "miss-count"
  | "first-open"
  | "mail-ip"
  | "mail-count"
  | "downloader"
  | "sign-in";

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

export type FindingNeed = "odd-ip" | "opener" | "odd-site" | "mail-ip" | "downloader";

export type QuestionSet = {
  id: QuestionSetId;
  tasks: CaseTask[];
  findingNeeds: FindingNeed[];
  findingPattern: RegExp;
  findingHint: string;
};

const findAccess: CaseTask = {
  id: "find-access",
  prompt: "Find the log of what people did on the office website. Use find so the path of access.log shows on screen.",
  hints: [
    "The file is named access.log.",
    "find looks through folders. A dot means start here.",
    "Type find . -name access.log",
  ],
  marked: "website log",
  check: { kind: "find", name: "access.log" },
};

const findVisits: CaseTask = {
  id: "find-visits",
  prompt: "Find the log of other websites people opened. Use find so the path of sites.log shows on screen.",
  hints: [
    "The file is named sites.log. It is not the office website log.",
    "Type find . -name sites.log",
  ],
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

export const QUESTION_SETS: QuestionSet[] = [
  {
    id: "missing-pages",
    findingNeeds: ["odd-ip"],
    findingPattern: /not found|not real/i,
    findingHint: "Say that pages were not found.",
    tasks: [
      findAccess,
      {
        id: "odd-ip",
        prompt: "One IP tried pages that are not real. The others did not. Write only that IP in answers/odd-ip.txt.",
        hints: [
          "In web/access.log, odd lines say not found.",
          "Type grep \"not found\" web/access.log",
          "Save it with echo THE-IP > answers/odd-ip.txt",
        ],
        marked: "odd IP",
        check: { kind: "exact", file: "answers/odd-ip.txt", key: "odd-ip", wrong: "odd-ip.txt is not the right IP" },
      },
      {
        id: "first-page",
        prompt: "What was the first page name that was not found? It starts with a slash. Write only that name in answers/page.txt.",
        hints: [
          "Look at the first not found line in web/access.log.",
          "The page name is the bit that starts with /.",
          "Save it with echo /page-name > answers/page.txt",
        ],
        marked: "page name",
        check: { kind: "exact", file: "answers/page.txt", key: "first-page", wrong: "page.txt is not the right page" },
      },
      {
        id: "miss-count",
        prompt: "How many lines say not found? Write only the number in answers/count.txt.",
        hints: [
          "grep can count. Type grep -c \"not found\" web/access.log",
          "Save that number with echo NUMBER > answers/count.txt",
        ],
        marked: "count",
        check: { kind: "exact", file: "answers/count.txt", key: "miss-count", wrong: "count.txt is not the right number" },
      },
      {
        id: "finding",
        prompt: "Write a finding in Report. Name the IP that tried pages that are not real, and what you would tell the office.",
        hints: [
          "Open Report. On a phone it is the Report tab.",
          "Put the odd IP in the note.",
          "Say that pages were not found. Two sentences is enough.",
        ],
        marked: "finding",
        check: { kind: "finding" },
      },
    ],
  },
  {
    id: "odd-website",
    findingNeeds: ["odd-site", "opener"],
    findingPattern: /not allowed|allow list|allow\.txt/i,
    findingHint: "Say the website is not allowed.",
    tasks: [
      findVisits,
      {
        id: "odd-site",
        prompt: "One website in the visits log is not on the allow.txt list. Write only that website in answers/site.txt.",
        hints: [
          "Type cat allow.txt and then cat visits/sites.log.",
          "The odd name is in the log and missing from the list.",
          "Save it with echo the-website > answers/site.txt",
        ],
        marked: "website",
        check: { kind: "exact", file: "answers/site.txt", key: "odd-site", wrong: "site.txt is not the right website" },
      },
      {
        id: "opener",
        prompt: "Which IP opened that website? Write only that IP in answers/opener.txt.",
        hints: [
          "Type grep the-website visits/sites.log",
          "The IP is the number after the time.",
          "Save it with echo THE-IP > answers/opener.txt",
        ],
        marked: "opener",
        check: { kind: "exact", file: "answers/opener.txt", key: "opener", wrong: "opener.txt is not the right IP" },
      },
      {
        id: "first-open",
        prompt: "What time was that website first opened? Write it like 09:00 in answers/time.txt.",
        hints: [
          "Use the same grep as the last step.",
          "The time is at the start of the first matching line.",
          "Save it with echo 09:00 > answers/time.txt",
        ],
        marked: "time",
        check: { kind: "exact", file: "answers/time.txt", key: "first-open", wrong: "time.txt is not the right time" },
      },
      {
        id: "finding",
        prompt: "Write a finding in Report. Name the website that is not allowed, the IP that opened it, and what you would tell the office.",
        hints: [
          "Open Report.",
          "Include the website and the IP that opened it.",
          "Say it is not allowed. Two sentences is enough.",
        ],
        marked: "finding",
        check: { kind: "finding" },
      },
    ],
  },
  {
    id: "mail-day",
    findingNeeds: ["mail-ip"],
    findingPattern: /mail/i,
    findingHint: "Say what the mail log showed.",
    tasks: [
      findMail,
      {
        id: "mail-ip",
        prompt: "Who sent the first mail to team@brightwater.example? Write only that IP in answers/mail-ip.txt.",
        hints: [
          "Open mail/sent.log. Each line is a time, an IP, and who they mailed.",
          "Type grep brightwater.example mail/sent.log",
          "Use the IP on the first matching line. echo THE-IP > answers/mail-ip.txt",
        ],
        marked: "mail IP",
        check: { kind: "exact", file: "answers/mail-ip.txt", key: "mail-ip", wrong: "mail-ip.txt is not the right IP" },
      },
      {
        id: "mail-count",
        prompt: "How many lines are in the mail log? Write only the number in answers/count.txt.",
        hints: ["Type wc -l mail/sent.log", "Or count the lines yourself.", "echo NUMBER > answers/count.txt"],
        marked: "mail count",
        check: { kind: "exact", file: "answers/count.txt", key: "mail-count", wrong: "count.txt is not the right number" },
      },
      {
        id: "mail-site",
        prompt:
          "The mail log names other websites after team@. Write one of those that is also on allow.txt, not the office site, in answers/site.txt.",
        hints: [
          "A mail line looks like sent mail to team@some-website.",
          "Skip brightwater.example. Check the other names against allow.txt.",
          "echo the-website > answers/site.txt",
        ],
        marked: "mailed website",
        check: { kind: "one-of", file: "answers/site.txt", wrong: "site.txt is not a website from the mail log" },
      },
      {
        id: "finding",
        prompt:
          "Write a finding in Report. Name the IP that sent the first office mail, one other website from the mail log, and what you would tell the office.",
        hints: [
          "Open Report.",
          "Include that IP and one website from the mail log.",
          "Mention the mail. Two sentences is enough.",
        ],
        marked: "finding",
        check: { kind: "finding" },
      },
    ],
  },
  {
    id: "office-day",
    findingNeeds: ["downloader", "odd-site"],
    findingPattern: /download|not allowed|allow list|allow\.txt/i,
    findingHint: "Say who downloaded the price list, or that a website is not allowed.",
    tasks: [
      findAccess,
      {
        id: "downloader",
        prompt: "Who downloaded the price list first? Write only that IP in answers/download.txt.",
        hints: [
          "Type grep downloaded web/access.log",
          "Use the IP on the first line.",
          "echo THE-IP > answers/download.txt",
        ],
        marked: "download",
        check: { kind: "exact", file: "answers/download.txt", key: "downloader", wrong: "download.txt is not the right IP" },
      },
      {
        id: "sign-in",
        prompt: "Who signed in first? Write only that IP in answers/signin.txt.",
        hints: ["Type grep \"signed in\" web/access.log", "Use the IP on the first line.", "echo THE-IP > answers/signin.txt"],
        marked: "sign in",
        check: { kind: "exact", file: "answers/signin.txt", key: "sign-in", wrong: "signin.txt is not the right IP" },
      },
      {
        id: "odd-site",
        prompt: "One website people opened is not on allow.txt. Write only that website in answers/site.txt.",
        hints: [
          "The visits are in visits/sites.log.",
          "Compare those names with allow.txt.",
          "echo the-website > answers/site.txt",
        ],
        marked: "website",
        check: { kind: "exact", file: "answers/site.txt", key: "odd-site", wrong: "site.txt is not the right website" },
      },
      {
        id: "finding",
        prompt:
          "Write a finding in Report. Name the IP that downloaded the price list, the website that is not allowed, and what you would tell the office.",
        hints: [
          "Open Report.",
          "Include the download IP and the website that is not allowed.",
          "Two sentences is enough.",
        ],
        marked: "finding",
        check: { kind: "finding" },
      },
    ],
  },
];

export function isQuestionSetId(value: unknown): value is QuestionSetId {
  return QUESTION_SETS.some((set) => set.id === value);
}

export function questionSet(id: QuestionSetId): QuestionSet {
  return QUESTION_SETS.find((set) => set.id === id) ?? QUESTION_SETS[0];
}

export function tasksForSet(id: QuestionSetId): CaseTask[] {
  return questionSet(id).tasks;
}
