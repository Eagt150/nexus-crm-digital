"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/lib/session";
import { AvatarMenu } from "./AvatarMenu";

export function AppHeader() {
  const currentUser = useCurrentUser();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-3 md:hidden">
      <span className="text-sm font-semibold tracking-tight text-text">Vibe CRM</span>
      {currentUser && <AvatarMenu trigger={<Avatar name={currentUser.nombre} size="sm" />} />}
    </header>
  );
}
