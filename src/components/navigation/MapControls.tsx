import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface MapControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onRecenter,
}) => {
  return (
    <div className="flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
      <button
        onClick={onZoomIn}
        disabled={zoomLevel >= 2.0}
        title="Zoom In"
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>

      <button
        onClick={onZoomOut}
        disabled={zoomLevel <= 0.8}
        title="Zoom Out"
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>

      <button
        onClick={onRecenter}
        title="Recenter Map View"
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};
