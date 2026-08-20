import React, { useState, useEffect } from 'react';
import type { DepartmentQueue } from '../types';
import { SmartCareAPI } from '../services/api';
import { DepartmentSelector } from '../components/queue/DepartmentSelector';
import { QueueCard } from '../components/queue/QueueCard';
import { QueueVisualizer } from '../components/queue/QueueVisualizer';
import { DoctorStatusCard } from '../components/queue/DoctorStatusCard';
import { Clock, RefreshCw } from 'lucide-react';

interface QueuePageProps {
  onNavigateToDept: (deptRoomId?: string) => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({ onNavigateToDept }) => {
  const [selectedDeptName, setSelectedDeptName] = useState<string>('Cardiology');
  const [queueData, setQueueData] = useState<DepartmentQueue | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    SmartCareAPI.getQueuePrediction(selectedDeptName).then((data) => {
      setQueueData(data);
      setIsLoading(false);
    });
  }, [selectedDeptName]);

  const handleAdvanceToken = () => {
    if (!queueData) return;
    setQueueData(prev => {
      if (!prev) return null;
      const nextToken = prev.currentToken + 1;
      const newPeopleAhead = Math.max(0, prev.patientToken - nextToken);
      const newWait = Math.max(0, newPeopleAhead * prev.avgConsultationMinutes);

      return {
        ...prev,
        currentToken: nextToken,
        peopleAhead: newPeopleAhead,
        estimatedWaitMinutes: newWait,
        lastUpdatedTime: 'Just now',
        tokenList: prev.tokenList.map(t => {
          if (t.tokenNumber === nextToken) return { ...t, status: 'consulting', estimatedTime: 'Now in room' };
          if (t.tokenNumber < nextToken) return { ...t, status: 'completed', estimatedTime: 'Done' };
          return t;
        })
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Patient Queue Prediction</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Real-time OPD token position tracking and doctor wait time estimates.
        </p>
      </div>

      {/* Department Selector */}
      <DepartmentSelector
        selectedDeptName={selectedDeptName}
        onSelectDepartment={setSelectedDeptName}
      />

      {isLoading ? (
        <div className="py-20 text-center text-teal-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400" />
          <p className="text-sm font-bold">Calculating Live Queue Prediction...</p>
        </div>
      ) : queueData ? (
        <div className="space-y-6">
          <QueueCard
            queue={queueData}
            onNavigateToDept={() => onNavigateToDept(queueData.deptName)}
          />

          <DoctorStatusCard
            queue={queueData}
            onAdvanceToken={handleAdvanceToken}
          />

          <QueueVisualizer
            queue={queueData}
          />
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">Select a department to view queue estimates</div>
      )}

    </div>
  );
};
