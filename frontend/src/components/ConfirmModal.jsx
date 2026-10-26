import { X, AlertCircle } from 'lucide-react';

export default function ConfirmModal({ 
 isOpen, 
 onClose, 
 title, 
 description, 
 confirmLabel, 
 confirmVariant = 'primary', 
 onConfirm 
}) {
 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
 <div className="bg-card rounded-lg shadow-xl w-full max-w-md border border-border overflow-hidden">
 <div className="flex items-center justify-between p-4 border-b border-border">
 <h3 className="text-base font-semibold text-primary flex items-center gap-2">
 {confirmVariant === 'danger' && <AlertCircle className="w-5 h-5 text-[#df1b41]" />}
 {title}
 </h3>
 <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-4">
 <p className="text-sm text-secondary">
 {description}
 </p>
 <div className="flex justify-end gap-3 mt-6">
 <button 
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={() => {
 onConfirm();
 onClose();
 }}
 className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
 confirmVariant === 'danger' 
 ? 'bg-[#df1b41] hover:bg-[#c8183a]' 
 : 'bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)]'
 }`}
 >
 {confirmLabel}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
