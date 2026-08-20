import React, { useState, useEffect } from 'react';
import type { VisitorInfo, AppViewTab } from '../types';
import { SmartCareAPI } from '../services/api';
import { Eye, Compass, Clock, Coffee, ShieldCheck, ArrowRight, Wifi, Car } from 'lucide-react';

interface VisitorDashboardPageProps {
  onTabChange: (tab: AppViewTab) => void;
}

export const VisitorDashboardPage: React.FC<VisitorDashboardPageProps> = ({ onTabChange }) => {
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null);

  useEffect(() => {
    SmartCareAPI.getVisitorInfo().then(setVisitorInfo);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Visitor Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 border border-cyan-800/40 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              VISITOR PORTAL
            </span>
            <span className="text-xs text-slate-400 font-mono">Guest Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Hospital Visitor Guide & Wayfinding
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Locate permitted destinations, check visiting hours, find parking, cafeteria and navigate indoor hospital floors.
          </p>
        </div>

        <button
          onClick={() => onTabChange('navigation')}
          className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>Launch Visitor Map</span>
        </button>
      </div>

      {visitorInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Key Guidelines */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Official Visiting Hours</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider">General Wards:</span>
                  <span className="text-sm font-bold text-white">{visitorInfo.visitingHours}</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-semibold block uppercase tracking-wider">ICU & Critical Care Wards:</span>
                  <span className="text-xs font-bold text-amber-200">{visitorInfo.icuVisitingHours}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Car className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Parking & Amenities</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <Car className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">Parking Information:</strong>
                    <p className="text-slate-300 mt-0.5">{visitorInfo.parkingInfo}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <Coffee className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">Hospital Cafeteria:</strong>
                    <p className="text-slate-300 mt-0.5">{visitorInfo.cafeteriaLocation}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">Visitor Wi-Fi:</strong>
                    <p className="text-slate-300 mt-0.5">{visitorInfo.wifiDetails}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Permitted Destinations */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">Permitted Visitor Destinations</h3>
                <span className="text-xs text-slate-400 font-mono">Privacy Protected</span>
              </div>

              <div className="space-y-3">
                {visitorInfo.permittedDestinations.map((dest, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-cyan-500/50 transition-all cursor-pointer"
                    onClick={() => onTabChange('navigation')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{dest}</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-slate-300 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  For patient safety and confidentiality, private medical records and sensitive ward access are restricted to authorized personnel.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
