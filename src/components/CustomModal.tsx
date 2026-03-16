import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'confirm' | 'alert';
}

export default function CustomModal({ isOpen, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, type = 'confirm' }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <h3 className="text-lg font-bold text-[#FFFBEC] mb-2">{title}</h3>
        <p className="text-[#B55204] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[#441B06] text-[#B55204] hover:bg-[#2A1509]">
              {cancelLabel}
            </button>
          )}
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-[#FFA300] text-[#0F0804] font-bold hover:bg-[#FDD34C]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
