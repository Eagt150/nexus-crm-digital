"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AvatarMenu } from "./AvatarMenu";
import { useNavItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const navItems = useNavItems();
  const currentUser = useCurrentUser();

  return (
    <aside className="hidden h-screen w-[240px] shrink-0 flex-col gap-1 border-r border-border bg-surface p-[14px] md:flex">
      <div className="mb-4 flex items-center gap-2 px-2 py-1">
        <span className="size-[26px] rounded-md bg-primary" aria-hidden />
        <span className="text-sm font-semibold tracking-tight text-text">Vibe CRM</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors duration-fast ease-standard",
                active
                  ? "bg-primary-subtle font-semibold text-primary"
                  : "font-medium text-muted hover:bg-surface-2"
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        {currentUser && (
          <AvatarMenu
            menuClassName="bottom-full top-auto left-0 right-auto mb-2 mt-0"
            trigger={
              <>
                <Avatar name={currentUser.nombre} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-text">
                    {currentUser.nombre}
                  </span>
                  <span className="truncate text-xs text-subtle">
                    {currentUser.rol === "propietaria" ? "Dueña" : "Comercial"}
                  </span>
                </span>
              </>
            }
          />
        )}
      </div>
    </aside>
  );
}
