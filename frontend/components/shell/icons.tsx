import { BarChart3, Bot, BookOpen, Calculator, CloudSun, Crown, Layers3, LayoutDashboard, Package, ShieldCheck, ShoppingCart, Sprout, Store, Tag, User, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShellIcon } from "@/lib/shell-nav";

const MAP: Record<ShellIcon, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, store: Store, wallet: Wallet, sprout: Sprout, "cloud-sun": CloudSun, package: Package, calculator: Calculator,
  "bar-chart": BarChart3, tag: Tag, crown: Crown, "book-open": BookOpen, bot: Bot, user: User, "shopping-cart": ShoppingCart, layers: Layers3, users: Users, "shield-check": ShieldCheck,
};
export function ShellIconView({ name, size = 18, className }: { name: ShellIcon; size?: number; className?: string }) {
  const Icon = MAP[name];
  return <Icon size={size} className={className} aria-hidden="true" />;
}
