"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Camera,
  ChartColumn,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/layout/Copyright";
import { MotionScrollIndicator } from "@/components/animations/MotionScrollIndicator";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    href: "/painel",
    label: "Painel",
    mobileLabel: "Painel",
    icon: LayoutDashboard,
    desktopOnly: true,
  },
  {
    href: "/inventario",
    label: "Inventario",
    mobileLabel: "Estoque",
    icon: Package,
  },
  {
    href: "/revisoes",
    label: "Revisoes",
    mobileLabel: "Revisoes",
    icon: ClipboardCheck,
  },
  {
    href: "/catalogo",
    label: "Catalogo",
    mobileLabel: "Catalogo",
    icon: BookOpen,
  },
  {
    href: "/solicitacoes",
    label: "Solicitacoes",
    mobileLabel: "Pedidos",
    icon: ShoppingCart,
  },
  {
    href: "/contagem",
    label: "Contagem",
    mobileLabel: "Contagem",
    icon: Camera,
  },
  {
    href: "/analise-giro",
    label: "Analise de Giro",
    mobileLabel: "Giro",
    icon: ChartColumn,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const mobileItems = menuItems.filter((item) => !item.desktopOnly);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.25)] backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden print:hidden">
      <ul className="grid grid-cols-6 gap-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "group relative flex h-12 min-w-0 items-center justify-center rounded-lg px-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden max-w-24 -translate-x-1/2 truncate rounded-md border bg-popover px-2 py-1 text-xs leading-none text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                  {item.mobileLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({
  onNavigate,
  collapsed = false,
  onCollapsedChange,
  collapsible = false,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const navRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <motion.aside
      className="fixed inset-y-0 left-0 z-40 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg print:hidden"
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.24, ease: "easeOut" }
      }
    >
      {collapsible && (
        <motion.button
          type="button"
          aria-label={collapsed ? "Expandir menu" : "Fechar menu"}
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent lg:flex"
          onClick={() => onCollapsedChange?.(!collapsed)}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </motion.button>
      )}

      <div className={cn("px-4 py-8", collapsed && "px-3")}>
        <Link
          href="/solicitacoes"
          onClick={handleClick}
          className="block lg:hidden"
        >
          <Image
            src="/ige-supergesso.svg"
            alt="Logo"
            width={200}
            height={120}
            className="mx-auto mb-2"
          />
        </Link>
        <Link href="/painel" onClick={handleClick} className="hidden lg:block">
          <Image
            src="/ige-supergesso.svg"
            alt="Logo"
            width={collapsed ? 44 : 200}
            height={collapsed ? 44 : 120}
            className={cn(
              "mx-auto mb-2 transition-all",
              collapsed && "h-11 w-11 object-contain",
            )}
          />
        </Link>
      </div>

      <nav
        ref={navRef}
        className={cn(
          "sidebar-scroll motion-scroll-container relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 pr-2",
          collapsed && "px-3 pr-2",
        )}
      >
        <ul className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li
                key={item.href}
                className={item.desktopOnly ? "hidden md:block" : undefined}
              >
                <Link
                  href={item.href}
                  onClick={handleClick}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <MotionScrollIndicator targetRef={navRef} />
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border px-4 py-4",
          collapsed && "px-3",
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 bg-white text-red-600 hover:bg-red-50 hover:text-red-700",
            collapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </Button>
        {!collapsed && (
          <Copyright className="mt-4 leading-relaxed text-sidebar-foreground/60" />
        )}
      </div>
    </motion.aside>
  );
}
