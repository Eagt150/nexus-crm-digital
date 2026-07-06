"use client";

import { Home, Users, TrendingUp, Shield, type LucideIcon } from "lucide-react";
import { useCurrentUser } from "@/lib/session";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const BASE_ITEMS: NavItem[] = [
  { id: "hoy", href: "/hoy", label: "Hoy", icon: Home },
  { id: "clientes", href: "/clientes", label: "Clientes", icon: Users },
  { id: "ventas", href: "/ventas", label: "Ventas", icon: TrendingUp },
];

const EQUIPO_ITEM: NavItem = { id: "equipo", href: "/equipo", label: "Equipo", icon: Shield };

export function useNavItems(): NavItem[] {
  const currentUser = useCurrentUser();
  if (currentUser?.rol === "propietaria") return [...BASE_ITEMS, EQUIPO_ITEM];
  return BASE_ITEMS;
}
