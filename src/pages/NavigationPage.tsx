import React, { useState, useEffect } from 'react';
import type { HospitalLocation, FloorLevel, NavigationRoute } from '../types';
import { SmartCareAPI } from '../services/api';
import { MOCK_LOCATIONS } from '../data/mockData';
import { HospitalMap } from '../components/navigation/HospitalMap';
import { FloorSelector } from '../components/navigation/FloorSelector';
import { MapControls } from '../components/navigation/MapControls';
import { LocationSearch } from '../components/navigation/LocationSearch';
import { GuidancePanel } from '../components/navigation/GuidancePanel';
import { StepGuidanceModal } from '../components/navigation/StepGuidanceModal';
import { Compass, RefreshCw } from 'lucide-react';

interface NavigationPageProps {
  initialDestinationId?: string | null;
}

export const NavigationPage: React.FC<NavigationPageProps> = ({ initialDestinationId }) => {
  const [locations] = useState<HospitalLocation[]>(MOCK_LOCATIONS);
  const [selectedOrigin] = useState<HospitalLocation>(MOCK_LOCATIONS[0]);
  const [selectedDestination, setSelectedDestination] = useState<HospitalLocation | null>(
    initialDestinationId ? MOCK_LOCATIONS.find(l => l.id === initialDestinationId) || MOCK_LOCATIONS[8] : MOCK_LOCATIONS[8]
  );
  const [currentFloor, setCurrentFloor] = useState<FloorLevel>('L0');
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    if (selectedOrigin && selectedDestination) {
      setIsLoadingRoute(true);
      SmartCareAPI.calculateRoute(selectedOrigin.id, selectedDestination.id).then(res => {
        setRoute(res);
        setIsLoadingRoute(false);
        setCurrentFloor(res.destination.floor);
      });
    } else {
      setRoute(null);
    }
  }, [selectedOrigin, selectedDestination]);

  const handleSelectDestination = (loc: HospitalLocation) => {
    setSelectedDestination(loc);
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setRoute(null);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.0, prev + 0.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.8, prev - 0.2));
  const handleRecenter = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Indoor Hospital Navigation</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Interactive multi-floor SVG map visualization with turn-by-turn waypoint guidance.
          </p>
        </div>

        {route && (
          <button
            onClick={() => setIsGuidanceModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
          >
            Launch Step Guidance Mode
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <LocationSearch
            locations={locations}
            selectedOrigin={selectedOrigin}
            selectedDestination={selectedDestination}
            onSelectDestination={handleSelectDestination}
            onClearDestination={handleClearDestination}
          />

          <GuidancePanel
            route={route}
            onStartGuidance={() => setIsGuidanceModalOpen(true)}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <FloorSelector
              currentFloor={currentFloor}
              onFloorChange={setCurrentFloor}
            />

            <MapControls
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onRecenter={handleRecenter}
            />
          </div>

          <div className="relative">
            {isLoadingRoute && (
              <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-3 text-teal-400 font-bold text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Calculating Turn-by-Turn Route...</span>
                </div>
              </div>
            )}

            <HospitalMap
              currentFloor={currentFloor}
              locations={locations}
              selectedOrigin={selectedOrigin}
              selectedDestination={selectedDestination}
              pathPoints={route ? route.pathCoordinates : []}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              onLocationSelect={(loc) => setSelectedDestination(loc)}
            />
          </div>
        </div>

      </div>

      {isGuidanceModalOpen && route && (
        <StepGuidanceModal
          route={route}
          onClose={() => setIsGuidanceModalOpen(false)}
        />
      )}

    </div>
  );
};
