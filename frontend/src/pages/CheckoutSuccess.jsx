import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutSuccess() {
 const navigate = useNavigate();

 useEffect(() => {
 const timer = setTimeout(() => {
 navigate('/');
 }, 3000);
 return () => clearTimeout(timer);
 }, [navigate]);

 return (
 <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
 <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full text-center">
 <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <h2 className="text-2xl font-bold text-white mb-2">Subscription Confirmed!</h2>
 <p className="text-neutral-400 mb-6">
 Thank you for subscribing to SolvAI. Your account has been upgraded.
 </p>
 <p className="text-sm text-neutral-500">
 Redirecting you to the dashboard...
 </p>
 </div>
 </div>
 );
}
