import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
 const [toasts, setToasts] = useState([]);

 const addToast = useCallback((message, type = 'info') => {
 const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
 setToasts((prev) => [...prev, { id, message, type }]);
 
 setTimeout(() => {
 removeToast(id);
 }, 3000);
 }, []);

 const removeToast = useCallback((id) => {
 setToasts((prev) => prev.filter((toast) => toast.id !== id));
 }, []);

 return (
 <ToastContext.Provider value={{ addToast }}>
 {children}
 <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
 {toasts.map((toast) => {
 let icon = <Info className="w-5 h-5 text-blue-500" />;
 let bg = 'bg-card border-border';
 if (toast.type === 'success') {
 icon = <CheckCircle2 className="w-5 h-5 text-green-500" />;
 } else if (toast.type === 'error') {
 icon = <AlertCircle className="w-5 h-5 text-red-500" />;
 }

 return (
 <div
 key={toast.id}
 className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 ${bg}`}
 role="alert"
 >
 {icon}
 <p className="text-sm font-medium text-primary">{toast.message}</p>
 <button
 onClick={() => removeToast(toast.id)}
 className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 );
 })}
 </div>
 </ToastContext.Provider>
 );
}

export function useToast() {
 return useContext(ToastContext);
}
