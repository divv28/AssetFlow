import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-white border-green-200 text-green-800 shadow-lg';
      case 'error':
        return 'bg-white border-red-200 text-red-800 shadow-lg';
      case 'info':
      default:
        return 'bg-white border-blue-200 text-blue-800 shadow-lg';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Floating Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] space-y-3 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-md transform transition-all duration-300 translate-y-0 animate-fade-in ${getStyles(
              t.type
            )}`}
          >
            {getIcon(t.type)}
            <div className="flex-1 text-sm font-medium leading-relaxed text-odoo-textPrimary">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-odoo-textPrimary transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
export default ToastContext;
