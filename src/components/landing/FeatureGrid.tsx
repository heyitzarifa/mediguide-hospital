import React from 'react';
import { Compass, Clock, FileText, ArrowRight } from 'lucide-react';
import type { AppViewTab } from '../../types';

interface FeatureGridProps {
  onTabChange: (tab: AppViewTab) => void;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({ onTabChange }) => {
  const features = [
    {
      id: 'navigation' as AppViewTab,
      title: 'Indoor Hospital Navigation',
      subtitle: 'Multi-Floor Interactive Map & Step-by-Step Wayfinding',
      description: 'Search any department, room, lab, or emergency desk. Get highlighted SVG floor routes with exact step guidance, elevators, and arrival ETA.',
      icon: Compass,
      tag: 'Interactive Map',
      color: 'from-teal-500 to-emerald-500',
      badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
      bullets: ['Multi-floor level switcher (L3, L2, L1, L0, B1)', 'Turn-by-turn instruction steps', 'Elevator & stair guidance']
    },
    {
      id: 'queue' as AppViewTab,
      title: 'Queue Prediction System',
      subtitle: 'Live Token Position & Wait Time Countdown',
      description: 'Select your department and doctor to see your live queue position (#8 in line), people ahead, doctor consultation status, and estimated wait minutes.',
      icon: Clock,
      tag: 'Live Tokens',
      color: 'from-cyan-500 to-teal-500',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
      bullets: ['Live token progression timeline', 'Doctor availability status (Consulting/Break)', 'Dynamic ETA updates']
    },
    {
      id: 'prescription' as AppViewTab,
      title: 'Prescription OCR & AI Explainer',
      subtitle: 'Instant Medicine Extraction & Patient Instructions',
      description: 'Upload or scan prescription slips. Advanced OCR extracts medicine names, dosages, timing, and provides plain-language AI instructions with safety notices.',
      icon: FileText,
      tag: 'AI OCR Reader',
      color: 'from-emerald-500 to-teal-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      bullets: ['Structured medicine dosage & frequency cards', 'Patient-friendly plain language summary', 'Doctor/pharmacist verification banner']
    }
  ];

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-teal-400">Core Platform Responsibilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            3 Powerful Modules Working in Harmony
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            Click any module below to launch the live prototype experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="group cursor-pointer bg-slate-900/90 border border-slate-800 hover:border-teal-500/60 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-xl bg-gradient-to-tr ${item.color} text-slate-950 shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeBg}`}>
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1 mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {item.description}
                  </p>

                  <ul className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4 mb-6">
                    {item.bullets.map((b, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-bold text-teal-400 group-hover:text-teal-300">
                  <span>Open {item.title}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
