import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { HospitalLocation } from '../../types';

interface LocationSearchProps {
  locations: HospitalLocation[];
  selectedOrigin: HospitalLocation;
  selectedDestination: HospitalLocation | null;
  onSelectDestination: (location: HospitalLocation) => void;
  onClearDestination: () => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  locations,
  selectedOrigin,
  selectedDestination,
  onSelectDestination,
  onClearDestination,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const popularPills = ['Cardiology', 'Emergency', 'Pharmacy', 'ICU', 'Laboratory', 'Cafeteria', 'Restroom'];

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.floorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-white space-y-4">
      
      {/* Starting Location Card */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Current Checkpoint</span>
            <span className="font-bold text-slate-200">{selectedOrigin.name}</span>
            <span className="text-teal-400 ml-2 font-mono">({selectedOrigin.floorName})</span>
          </div>
        </div>
      </div>

      {/* Prominent Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 focus-within:border-teal-500 rounded-xl px-3.5 py-2.5 transition-all">
          <Search className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Where do you want to go? (e.g. Cardiology, Room 2-14)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {selectedDestination && (
            <button 
              onClick={onClearDestination}
              className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && searchTerm && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
            {filteredLocations.length > 0 ? (
              filteredLocations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => {
                    onSelectDestination(loc);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-800 text-left border-b border-slate-800/60 last:border-0 transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-white">{loc.name}</div>
                    <div className="text-[11px] text-slate-400">{loc.description}</div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    {loc.floorName}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">No matching hospital locations found</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Search Category Pills */}
      <div>
        <span className="text-[11px] text-slate-400 font-semibold block mb-2">Quick Destinations:</span>
        <div className="flex flex-wrap gap-1.5">
          {popularPills.map((category) => (
            <button
              key={category}
              onClick={() => {
                const match = locations.find(l => l.category === category);
                if (match) onSelectDestination(match);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-teal-600/30 text-slate-300 hover:text-teal-300 border border-slate-700 text-xs transition-colors"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
