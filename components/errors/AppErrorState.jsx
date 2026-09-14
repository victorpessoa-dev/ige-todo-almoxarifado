"use client";

import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCcw,
  SearchX,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const variants = {
  "not-found": {
    icon: SearchX,
    eyebrow: "404",
    title: "Pagina nao encontrada",
    description:
      "O endereco pode ter mudado ou a pagina nao existe mais no IGE Almoxarifado.",
    primaryLabel: "Ir para solicitacoes",
    primaryHref: "/solicitacoes",
  },
  error: {
    icon: AlertTriangle,
    eyebrow: "Erro",
    title: "Nao foi possivel carregar esta tela",
    description:
      "A aplicacao encontrou uma falha inesperada. Tente novamente ou volte para uma area estavel do sistema.",
    primaryLabel: "Tentar novamente",
    primaryHref: null,
  },
  connection: {
    icon: WifiOff,
    eyebrow: "Conexao",
    title: "Sem conexao com o sistema",
    description:
      "Verifique a internet e tente novamente. Algumas telas precisam de conexao para consultar os dados atualizados.",
    primaryLabel: "Tentar novamente",
    primaryHref: null,
  },
};

export function AppErrorState({
  variant = "error",
  onRetry,
  details,
  showBack = true,
}) {
  const content = variants[variant] || variants.error;
  const Icon = content.icon;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8 text-foreground">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border bg-muted">
            <Icon className="h-8 w-8 text-primary" />
          </div>

          <Image
            src="/ige-supergesso.svg"
            alt="IGE Supergesso"
            width={132}
            height={76}
            className="mx-auto mb-5 h-auto"
            priority
          />

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {content.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal">
            {content.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {content.description}
          </p>

          {details && (
            <p className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {details}
            </p>
          )}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {content.primaryHref ? (
              <Button asChild>
                <Link href={content.primaryHref}>
                  <Home className="h-4 w-4" />
                  {content.primaryLabel}
                </Link>
              </Button>
            ) : (
              <Button type="button" onClick={handleRetry}>
                <RefreshCcw className="h-4 w-4" />
                {content.primaryLabel}
              </Button>
            )}

            {showBack ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                    return;
                  }
                  window.location.href = "/solicitacoes";
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">Abrir login</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
