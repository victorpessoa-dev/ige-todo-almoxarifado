"use client";

import { isValidElement } from "react";
import { ToastAction } from "@/components/ui/toast";
import {
  dismiss as dismissRadixToast,
  toast as createRadixToast,
} from "@/hooks/use-toast";

function createAction(action) {
  if (!action) return undefined;
  if (isValidElement(action)) return action;

  return (
    <ToastAction altText={action.label || "Ação"} onClick={action.onClick}>
      {action.label}
    </ToastAction>
  );
}

function showToast(variant, title, options = {}) {
  return createRadixToast({
    id: options.id,
    title,
    description: options.description,
    duration: options.duration,
    action: createAction(options.action),
    variant,
    className: options.className,
    onOpenChange: (open) => {
      if (!open) {
        options.onDismiss?.();
      }
    },
  });
}

function baseToast(title, options) {
  return showToast("default", title, options);
}

baseToast.success = (title, options) => showToast("success", title, options);
baseToast.error = (title, options) => showToast("error", title, options);
baseToast.info = (title, options) => showToast("info", title, options);
baseToast.warning = (title, options) => showToast("warning", title, options);
baseToast.dismiss = dismissRadixToast;

export const toast = baseToast;
