import React from 'react';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';

export const SignIn: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Pulse CS</h1>
            <p className="text-slate-500 text-sm mb-1">
              Google ile giriş yapın
            </p>
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Sadece @alo-tech.com veya @callcenterstudio.com email adresleri ile giriş yapabilirsiniz
            </p>
          </div>
          
          <ClerkSignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium",
                socialButtonsBlockButtonText: "text-slate-700",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                formFieldInput: "border-slate-200 focus:border-blue-500 focus:ring-blue-500",
                footerActionLink: "text-blue-600 hover:text-blue-700",
              }
            }}
            routing="hash"
          />
        </div>
      </div>
    </div>
  );
};

