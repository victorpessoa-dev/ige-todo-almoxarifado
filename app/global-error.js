"use client";

import "./globals.css";
import { useEffect } from "react";
import { AppErrorState } from "@/components/errors/AppErrorState";
import { logger } from "@/lib/logging/logger";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    logger.error("Erro global capturado", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="overflow-x-hidden bg-background font-sans text-foreground antialiased dark">
        <AppErrorState
          variant="error"
          onRetry={reset}
          details={error?.digest ? `Codigo: ${error.digest}` : undefined}
        />
      </body>
    </html>
  );
}
