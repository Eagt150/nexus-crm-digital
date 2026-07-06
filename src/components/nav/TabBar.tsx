"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNavItems } from "./nav-items";

export function TabBar() {
  const pathname = usePathname();
  const navItems = useNavItems();

  return (
    <nav className="flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors duration-fast ease-standard",
              active ? "font-semibold text-primary" : "font-medium text-subtle"
            )}
          >
            <Icon className="size-[22px]" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
