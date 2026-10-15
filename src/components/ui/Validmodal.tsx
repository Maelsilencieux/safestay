import React from 'react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmation",
  message = "Êtes-vous sûr de vouloir effectuer cette action ?",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  type = "danger", // "danger", "warning", ou "info"
  loading = false,
}) {
  if (!isOpen) return null;

  // Couleurs du bouton selon le type d'action
  const buttonStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    info: "bg-emerald-700 hover:bg-emerald-800 text-white focus:ring-emerald-500",
  };

  const iconColors = {
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
    info: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      {/* Container principal de la modale */}
      <div 
        className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {/* Icône d'avertissement */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconColors[type] || iconColors.danger}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <div className="mt-1 w-full">
            <h3 className="text-lg font-bold text-gray-900 leading-6">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions (Boutons Annuler et Confirmer) */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 sm:w-auto disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex w-full justify-center items-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto disabled:opacity-50 transition-colors ${buttonStyles[type] || buttonStyles.danger}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Traitement...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}