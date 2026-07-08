import { X, AlertCircle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = 'Confirmação', 
  message, 
  confirmText = 'OK', 
  cancelText = 'Cancelar', 
  onConfirm, 
  onClose 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[360px] transform overflow-hidden rounded-[2rem] bg-white dark:bg-[#12101b] border border-gray-100 dark:border-white/10 p-6 text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center mt-3">
          {/* Icon Header */}
          <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-purple-500/10 flex items-center justify-center text-blue-600 dark:text-purple-400 mb-4">
            <AlertCircle size={22} />
          </div>

          {/* Title */}
          {title && (
            <h3 className="text-[14.5px] font-bold text-gray-950 dark:text-white tracking-wide mb-2">
              {title}
            </h3>
          )}

          {/* Message */}
          <p className="text-[12.5px] text-gray-500 dark:text-gray-400 font-light leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-150 dark:border-white/10 text-gray-600 dark:text-gray-300 text-[12px] font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors text-center outline-none"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-tr from-blue-600 to-purple-600 text-white text-[12px] font-medium rounded-xl hover:opacity-90 shadow-md shadow-blue-500/15 cursor-pointer transition-opacity text-center outline-none border-none"
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
