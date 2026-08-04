import React from 'react';
import { Award, Shield, Users, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent sm:text-5xl dark:from-brand-400 dark:to-emerald-400">
          About ResellIt
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-base text-slate-500 dark:text-slate-400">
          Empowering users to buy, sell, and negotiate securely through cutting-edge design and modern automation features.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-center text-slate-850 dark:text-white">Our Core Pillars</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-brand-50 p-3.5 rounded-2xl w-fit mb-4 dark:bg-brand-950/20">
              <Shield className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Escrow Safety</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Payments are deposited in our secure escrow wallet and only released after delivery confirmation, shielding you from fraud.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-emerald-50 p-3.5 rounded-2xl w-fit mb-4 dark:bg-emerald-950/20">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Bargaining Engine</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Skip endless phone negotiations. Our system evaluates price proposals and triggers auto-accepts or counter-offers.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-emerald-50 p-3.5 rounded-2xl w-fit mb-4 dark:bg-emerald-950/20">
              <Heart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Built for Pakistan</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Supporting PKRs, local cities from Karachi to Islamabad, and tailored communication fields for a smooth experience.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-brand-50 p-3.5 rounded-2xl w-fit mb-4 dark:bg-brand-950/20">
              <Award className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">AI-Driven Autofill</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              List products in seconds. Our smart AI generates professional titles, descriptions, and suggests optimal listing prices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
