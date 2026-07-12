import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Drawer = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      ></div>

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen max-w-md bg-white border-l border-odoo-border shadow-xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col overflow-y-scroll bg-white">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-odoo-border bg-odoo-bg shrink-0">
              <h2 className="text-base font-bold text-odoo-textPrimary">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-odoo-textPrimary hover:bg-gray-100 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 relative">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
