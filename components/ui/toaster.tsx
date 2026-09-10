"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageCircle,
  XCircle,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

function ToastIcon({ variant }: { variant?: string | null }) {
  const className = "mt-0.5 h-5 w-5 shrink-0";

  switch (variant) {
    case "success":
      return <CheckCircle2 className={`${className} text-emerald-500`} />;
    case "warning":
      return <AlertTriangle className={`${className} text-amber-500`} />;
    case "error":
    case "destructive":
      return <XCircle className={`${className} text-red-500`} />;
    case "info":
      return <Info className={`${className} text-blue-500`} />;
    default:
      return <MessageCircle className={`${className} text-primary`} />;
  }
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <ToastIcon variant={variant} />
            <div className="grid min-w-0 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
