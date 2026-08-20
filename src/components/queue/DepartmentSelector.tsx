import React from 'react';
import { MOCK_QUEUES } from '../../data/mockData';
import { Building2 } from 'lucide-react';

interface DepartmentSelectorProps {
  selectedDeptName: string;
  onSelectDepartment: (deptName: string) => void;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  selectedDeptName,
  onSelectDepartment,
}) => {
  const departments = Object.keys(MOCK_QUEUES);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-widest">
        <Building2 className="w-4 h-4" />
        <span>Select OPD Department & Doctor</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {departments.map((deptKey) => {
          const dept = MOCK_QUEUES[deptKey];
          const isActive = selectedDeptName === deptKey;

          return (
            <button
              key={deptKey}
              onClick={() => onSelectDepartment(deptKey)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-teal-950/80 border-teal-500 text-white shadow-lg shadow-teal-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">{dept.deptName.replace(' Department', '')}</span>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  dept.queueLoadStatus === 'Low' ? 'bg-emerald-500/20 text-emerald-300' :
                  dept.queueLoadStatus === 'Moderate' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {dept.queueLoadStatus}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {dept.doctorName.split(',')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
