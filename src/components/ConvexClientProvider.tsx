"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Tolerant on purpose: lets the app build/run before `npx convex dev` has
// populated NEXT_PUBLIC_CONVEX_URL. Once it's set, this provides real data.
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return children;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
