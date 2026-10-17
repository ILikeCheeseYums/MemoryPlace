import React from 'react';

export default function FeatureCard({ iconSrc, title, description, hoverBorderColor }) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all ${hoverBorderColor || 'hover:border-slate-300'}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center mb-3">
        <img src={iconSrc} alt="" className="w-5 h-5 pointer-events-none" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
