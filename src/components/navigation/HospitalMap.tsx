import React from 'react';
import type { HospitalLocation, FloorLevel, PathPoint } from '../../types';

interface HospitalMapProps {
  currentFloor: FloorLevel;
  locations: HospitalLocation[];
  selectedOrigin: HospitalLocation;
  selectedDestination: HospitalLocation | null;
  pathPoints: PathPoint[];
  zoomLevel: number;
  panOffset: { x: number; y: number };
  onLocationSelect: (location: HospitalLocation) => void;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  currentFloor,
  locations,
  selectedOrigin,
  selectedDestination,
  pathPoints,
  zoomLevel,
  panOffset,
  onLocationSelect,
}) => {
  const floorLocations = locations.filter(l => l.floor === currentFloor);
  const activeFloorPoints = pathPoints.filter(p => p.floor === currentFloor);

  const svgPathString = activeFloorPoints.length > 1
    ? activeFloorPoints.reduce((acc, point, index) => {
        return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
      }, '')
    : '';

  const floorRooms = [
    { id: 'r1', name: currentFloor === 'L0' ? 'Emergency G-00' : currentFloor === 'L2' ? 'Neurology 2-05' : 'Room A-1', x: 80, y: 120, width: 180, height: 160, fill: '#1e293b' },
    { id: 'r2', name: currentFloor === 'L0' ? 'Main Reception Desk' : currentFloor === 'L1' ? 'Pathology Lab 1-08' : 'Room A-2', x: 80, y: 350, width: 180, height: 180, fill: '#0f172a' },
    { id: 'elev', name: 'Elevator Bank A', x: 350, y: 250, width: 100, height: 100, fill: '#0f766e' },
    { id: 'r3', name: currentFloor === 'L2' ? 'Cardiology 2-14' : currentFloor === 'B1' ? 'Cafeteria B-10' : 'Room B-1', x: 540, y: 120, width: 200, height: 160, fill: '#1e293b' },
    { id: 'r4', name: currentFloor === 'L0' ? 'Pharmacy G-12' : currentFloor === 'L2' ? 'Orthopedics 2-22' : 'Room B-2', x: 540, y: 350, width: 200, height: 180, fill: '#1e293b' },
  ];

  return (
    <div className="relative w-full h-[520px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl select-none">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl backdrop-blur-md">
        <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
          FLOOR MAP — LEVEL {currentFloor}
        </span>
      </div>

      <div 
        className="w-full h-full transition-transform duration-300 ease-out flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`
        }}
      >
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full max-w-[800px] max-h-[600px]"
        >
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          </pattern>
          <rect width="800" height="600" fill="url(#grid)" />

          <rect x="50" y="290" width="700" height="40" fill="#334155" opacity="0.4" rx="6" />
          <rect x="380" y="50" width="40" height="500" fill="#334155" opacity="0.4" rx="6" />

          {floorRooms.map(room => (
            <g key={room.id}>
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                fill={room.fill}
                stroke="#475569"
                strokeWidth="2"
                rx="12"
                opacity="0.85"
              />
              <text
                x={room.x + room.width / 2}
                y={room.y + room.height / 2}
                fill="#94a3b8"
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {room.name}
              </text>
            </g>
          ))}

          {svgPathString && (
            <>
              <path
                d={svgPathString}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                filter="url(#glow)"
              />
              <path
                d={svgPathString}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-dash"
              />
            </>
          )}

          {floorLocations.map(loc => {
            const isOrigin = selectedOrigin.id === loc.id;
            const isDestination = selectedDestination?.id === loc.id;

            return (
              <g 
                key={loc.id} 
                className="cursor-pointer group" 
                onClick={() => onLocationSelect(loc)}
              >
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={isOrigin || isDestination ? "14" : "10"}
                  fill={isOrigin ? "#0d9488" : isDestination ? "#e11d48" : "#334155"}
                  stroke={isOrigin ? "#2dd4bf" : isDestination ? "#fda4af" : "#64748b"}
                  strokeWidth="3"
                  className="transition-all duration-300 group-hover:scale-125"
                />

                {(isOrigin || isDestination) && (
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r="22"
                    fill="none"
                    stroke={isOrigin ? "#2dd4bf" : "#e11d48"}
                    strokeWidth="2"
                    opacity="0.6"
                    className="animate-ping"
                  />
                )}

                <rect
                  x={loc.x - 60}
                  y={loc.y - 34}
                  width="120"
                  height="22"
                  rx="6"
                  fill={isOrigin ? "#0d9488" : isDestination ? "#9f1239" : "#0f172a"}
                  stroke={isOrigin ? "#2dd4bf" : isDestination ? "#f43f5e" : "#475569"}
                  strokeWidth="1"
                />
                <text
                  x={loc.x}
                  y={loc.y - 20}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {isOrigin ? 'YOU ARE HERE' : isDestination ? 'DESTINATION' : loc.name.substring(0, 15)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
};
