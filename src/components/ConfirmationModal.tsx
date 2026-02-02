import React from 'react';
import { X, AlertTriangle, Skull } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  isSubmitting?: boolean;
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  isSubmitting = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Skull className="w-6 h-6 text-red-600" />,
          headerBg: 'bg-red-50 border-red-200',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          iconBg: 'bg-red-100'
        };
      case 'info':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
          headerBg: 'bg-blue-50 border-blue-200',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-pirateRed" />,
          headerBg: 'bg-pirateRed bg-opacity-10 border-pirateRed border-opacity-30',
          confirmBg: 'bg-pirateRed hover:bg-pirateRedDark',
          iconBg: 'bg-pirateRed bg-opacity-10'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${styles.headerBg}`}>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${styles.iconBg}`}>
              {styles.icon}
            </div>
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${styles.confirmBg}`}
            >
              {isSubmitting ? 'Procesando...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}