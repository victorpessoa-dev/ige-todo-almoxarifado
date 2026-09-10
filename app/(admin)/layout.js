"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/notifications/toast";
import { useAuth } from "@/contexts/auth-context";
import { DataProvider, useData } from "@/contexts/data-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingState } from "@/components/ui/spinner";
import { Menu } from "lucide-react";
import Image from "next/image";
import { formatSolicitacaoItem } from "@/lib/solicitacoes/format";
import { MotionScrollIndicator } from "@/components/animations/MotionScrollIndicator";
import { ReviewNotification } from "@/components/revisoes/ReviewNotification";
import { playNotificationSound } from "@/lib/notifications/sound";

function AdminShell({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { solicitacoesCompra = [], isLoaded, error, loadData } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const notifiedSolicitacoesRef = useRef(new Set());
  const notificationBaselineReadyRef = useRef(false);
  const mainScrollRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated || isLoading || pathname !== "/painel") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    router.replace("/solicitacoes");
  }, [isAuthenticated, isLoading, pathname, router]);

  useEffect(() => {
    const body = document.body;

    if (sidebarOpen) {
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
    }

    return () => {
      body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !isLoaded) return;

    const currentSolicitacaoIds = new Set(
      solicitacoesCompra
        .map((solicitacao) => solicitacao.id || solicitacao.codigo)
        .filter(Boolean),
    );

    if (!notificationBaselineReadyRef.current) {
      notifiedSolicitacoesRef.current = currentSolicitacaoIds;
      notificationBaselineReadyRef.current = true;
      return;
    }

    const solicitacoesNaoNotificadas = solicitacoesCompra.filter(
      (solicitacao) => {
        const key = solicitacao.id || solicitacao.codigo;
        return (
          solicitacao.status_geral === "nova" &&
          key &&
          !notifiedSolicitacoesRef.current.has(key)
        );
      },
    );

    currentSolicitacaoIds.forEach((key) =>
      notifiedSolicitacoesRef.current.add(key),
    );

    if (solicitacoesNaoNotificadas.length === 0) return;

    const primeiraSolicitacao = solicitacoesNaoNotificadas[0];
    const total = solicitacoesNaoNotificadas.length;
    playNotificationSound();

    toast.info(
      total === 1
        ? "Nova solicitacao recebida"
        : total + " novas solicitacoes recebidas",
      {
        description:
          total === 1
            ? (primeiraSolicitacao.codigo || "Sem codigo") +
              " - " +
              (formatSolicitacaoItem(primeiraSolicitacao) ||
                "Pedido sem descricao")
            : "Existem novos pedidos aguardando aceite.",
        action: {
          label: "Ver",
          onClick: () => router.push("/solicitacoes"),
        },
      },
    );
  }, [isAuthenticated, isLoaded, isLoading, router, solicitacoesCompra]);

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <motion.div
        className="hidden shrink-0 lg:block"
        aria-hidden="true"
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.24, ease: "easeOut" }
        }
      />

      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          collapsible
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/solicitacoes" aria-label="Ir para solicitacoes">
            <Image
              src="/ige-supergesso.svg"
              alt="Logo"
              width={100}
              height={75}
              className="mx-auto"
            />
          </Link>

          <div className="w-6" aria-hidden="true" />
        </div>

        <div
          ref={mainScrollRef}
          className="admin-main-scroll motion-scroll-container scrollbar-soft relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 md:px-6 md:py-5 lg:px-8 lg:py-6"
        >
          <motion.div
            key={pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: "easeOut" }
            }
          >
            {error && !isLoaded ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-card p-6 text-center"
              >
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  type="button"
                  className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    void loadData().catch(() => {});
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              children
            )}
          </motion.div>
          <MotionScrollIndicator targetRef={mainScrollRef} />
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <LoadingState className="min-h-screen bg-background" />;
  if (!isAuthenticated) return null;

  return (
    <DataProvider>
      <ReviewNotification />
      <AdminShell>{children}</AdminShell>
    </DataProvider>
  );
}
