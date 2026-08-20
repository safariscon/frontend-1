/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', durationMs = 4200) => {
    const text = String(message || '').trim();
    if (!text) return null;
    const id = ++toastId;
    setToasts((current) => [...current.slice(-4), { id, message: text, type }]);
    if (durationMs > 0) {
      window.setTimeout(() => dismiss(id), durationMs);
    }
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    success: (message, durationMs) => push(message, 'success', durationMs),
    error: (message, durationMs) => push(message, 'error', durationMs),
    info: (message, durationMs) => push(message, 'info', durationMs),
    dismiss,
  }), [dismiss, push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return value;
}

function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-blue-200 bg-blue-50 text-blue-950',
  }[toast.type] || 'border-slate-200 bg-white text-slate-900';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${styles}`}
    >
      <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
