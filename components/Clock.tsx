import React from 'react';

interface ClockProps {
  currentTime: Date;
  isAlarmSet: boolean;
  timeRemaining: string | null;
}

export const Clock: React.FC<ClockProps> = ({ currentTime, isAlarmSet, timeRemaining }) => {
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateString = currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="text-center bg-black/20 p-6 rounded-lg border border-slate-700 shadow-lg w-full">
      {isAlarmSet && timeRemaining ? (
        <>
          <div className="text-slate-400 mb-2 text-md">Time Remaining</div>
          <div className="font-display text-6xl md:text-7xl tracking-widest text-orange-400">
            {timeRemaining}
          </div>
        </>
      ) : (
        <>
          <div className="font-display text-6xl md:text-7xl tracking-widest text-orange-400">
            {timeString}
          </div>
          <div className="text-slate-400 mt-2 text-md">
            {dateString}
          </div>
        </>
      )}
    </div>
  );
};
