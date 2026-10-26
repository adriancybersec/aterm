"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { lessons } from "@/lib/lessons/catalog";
import { completedCount, loadAccount, saveAccount } from "@/lib/progress/store";
import { useAccount } from "@/lib/progress/use-account";

export function AccountPanel() {
  const account = useAccount();
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const name = draft ?? account.name;

  const total = lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0);
  const done = lessons.reduce(
    (sum, lesson) => sum + completedCount(account, lesson.slug, lesson.tasks.map((task) => task.id)),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Account</p>
      <h1 className="mt-3 text-3xl text-amber">Stored on this device.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Aterx keeps your name, plan, and marked tasks in local storage. Nothing is sent to a server. Clearing the site data clears the account.
      </p>

      <form
        className="mt-8 max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          const next = { ...loadAccount(), name: name.trim().slice(0, 40) || "Student" };
          saveAccount(next);
          setDraft(null);
        }}
      >
        <label htmlFor="name" className="text-sm text-muted">
          Name on the lab prompt stays student. This name is for the account page.
        </label>
        <div className="mt-2 flex gap-2">
          <Input id="name" value={name} maxLength={40} onChange={(event) => setDraft(event.target.value)} />
          <Button type="submit">Save</Button>
        </div>
      </form>

      <section className="mt-12" id="plans">
        <h2 className="font-serif text-3xl tracking-tight">Plan</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Free covers lessons 1 and 2. Pro opens all five lessons. Plus adds solution reveals and the extra sandbox presets.
        </p>
        <div className="mt-6">
          <PricingGrid mode="link" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl tracking-tight">Progress</h2>
        <p className="mt-2 font-mono text-sm text-muted">
          {done}/{total} tasks marked
        </p>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {lessons.map((lesson) => {
            const marked = completedCount(account, lesson.slug, lesson.tasks.map((task) => task.id));
            return (
              <li key={lesson.slug} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/learn/${lesson.slug}`} className="hover:text-amber">
                  {lesson.number}. {lesson.title}
                </Link>
                <span className="font-mono text-xs text-faint">
                  {marked}/{lesson.tasks.length}
                </span>
              </li>
            );
          })}
        </ul>
        <Button variant="outline" className="mt-4" onClick={() => setConfirmClear(true)}>
          Clear ticks
        </Button>
      </section>

      <Modal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear marked tasks?"
        description="Your name and plan stay. Lesson ticks on this device are removed."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const next = { ...loadAccount(), completed: {} };
              saveAccount(next);
              setConfirmClear(false);
            }}
          >
            Clear ticks
          </Button>
        </div>
      </Modal>
    </div>
  );
}
