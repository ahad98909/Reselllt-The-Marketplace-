import React from 'react';
import { Scale, CheckCircle2 } from 'lucide-react';

export default function Terms() {
  const termsList = [
    {
      title: '1. Listing Integrity',
      desc: 'All listings posted on the marketplace must represent actual, existing physical items. Sellers must describe condition accurately and refrain from listing banned or hazardous items.'
    },
    {
      title: '2. Transaction Escrow Protocol',
      desc: 'When using checkout, funds are deposited securely in escrow. Releasing funds completes the contract, and the buyer certifies that the item has been received and verified. Releases cannot be undone.'
    },
    {
      title: '3. Communication Conduct',
      desc: 'Users must maintain polite, respect-based dialog inside the messaging inbox. Scam attempts, abuse, spam listing spamming, or fraudulent listings will result in instant account ban.'
    },
    {
      title: '4. Fees and Settlement',
      desc: 'There are no listing fees. All pricing is negotiated in PKR. Sellers are responsible for delivering the items according to the arrangement discussed in the product chat.'
    }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent sm:text-5xl dark:from-brand-400 dark:to-emerald-400">
          Terms & Conditions
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto dark:text-slate-400">
          Please review the rules, guidelines, and terms governing our peer-to-peer marketplace.
        </p>
      </div>

      {/* Terms list */}
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <Scale className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            Marketplace Rules of Engagement
          </h2>
          
          <div className="space-y-6">
            {termsList.map((t, i) => (
              <div key={i} className="flex gap-4 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5 dark:text-brand-400" />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{t.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-center text-slate-400 mt-8">
          Last Updated: July 2026. We reserve the right to amend these guidelines at any time to preserve safety on the marketplace.
        </p>
      </div>
    </div>
  );
}
