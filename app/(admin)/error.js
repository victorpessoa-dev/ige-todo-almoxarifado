"use client";

import { useEffect } from "react";
import { AppErrorState } from "@/components/errors/AppErrorState";
import { logger } from "@/lib/logging/logger";

export default function AdminErrorPage({ error, reset }) {
  useEffect(() => {
    logger.error("Erro administrativo capturado", error);
  }, [error]);

  return (
    <AppErrorState
      variant="error"
      onRetry={reset}
      details={error?.digest ? `Codigo: ${error.digest}` : undefined}
    />
  );
}
