import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Share_Tech_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

const matrix = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-matrix",
});

export const metadata: Metadata = {
  title: {
    default: "Aterx — Learn Linux by typing it",
    template: "%s · Aterx",
  },
  description:
    "A browser lab for first and second year cyber and IT students. Short Linux tasks, a virtual terminal, and checks that mark your work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" className={`${matrix.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-amber focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="content" className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
