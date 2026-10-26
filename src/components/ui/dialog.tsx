"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">
          <Dialog.Title className="font-serif text-2xl tracking-tight">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted">{description}</Dialog.Description>
          ) : null}
          <div className="mt-5">{children}</div>
          <Dialog.Close
            className="absolute top-4 right-4 rounded-full p-1 text-muted hover:text-paper"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
