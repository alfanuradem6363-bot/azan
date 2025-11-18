import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LibrarySound } from '../types';
import * as db from '../utils/db';

interface AlarmFormProps {
  onSetAlarm: (time: string, questions: number, sound: LibrarySound, customFile: File | null, volume: number) => void;
  onCancelAlarm: () => void;
  isAlarmSet: boolean;
  alarmTime: string | null;
  soundLibrary: LibrarySound[];
  onDownload: (sound: LibrarySound) => void;
  onDelete: (sound: LibrarySound) => void;
}

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block mb-2 text-sm font-medium text-slate-300">{children}</label>
);

const SoundActionButton: React.FC<{sound: LibrarySound, onDownload: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void}> = ({ sound, onDownload, onDelete }) => {
    const baseClasses = "text-xs font-semibold py-1 px-2 rounded-md transition-colors";
    switch (sound.status) {
        case 'NOT_DOWNLOADED':
            return <button type="button" onClick={onDownload} className={`${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`}>Download</button>;
        case 'DOWNLOADING':
            return <span className={`${baseClasses} text-slate-300`}>Downloading...</span>;
        case 'DOWNLOADED':
            return <button type="button" onClick={onDelete} className={`${baseClasses} bg-red-600 hover:bg-red-700 text-white`}>Delete</button>;
        default:
            return null;
    }
}

export const AlarmForm: React.FC<AlarmFormProps> = ({ onSetAlarm, onCancelAlarm, isAlarmSet, alarmTime, soundLibrary, onDownload, onDelete }) => {
  const [time, setTime] = useState('07:00');
  const [questions, setQuestions] = useState(10);
  const [selectedSound, setSelectedSound] = useState<LibrarySound | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [volume, setVolume] = useState(100);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const soundPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedSound && soundLibrary.length > 0) {
      setSelectedSound(soundLibrary[0]);
    }
  }, [soundLibrary, selectedSound]);

  // Close sound picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (soundPickerRef.current && !soundPickerRef.current.contains(event.target as Node)) {
        setIsSoundPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Effect to manage the source of the preview audio player
  useEffect(() => {
    const audioEl = previewAudioRef.current;
    if (!audioEl) return;

    let objectUrlToRevoke: string | null = null;

    const setAudioSource = async () => {
      try {
        if (customFile) {
          objectUrlToRevoke = URL.createObjectURL(customFile);
          audioEl.src = objectUrlToRevoke;
        } else if (selectedSound) {
          if (selectedSound.status === 'DOWNLOADED') {
            const blob = await db.getSound(selectedSound.name);
            if (blob) {
              objectUrlToRevoke = URL.createObjectURL(blob);
              audioEl.src = objectUrlToRevoke;
            } else {
              audioEl.src = selectedSound.url;
            }
          } else {
            audioEl.src = selectedSound.url;
          }
        }
        audioEl.load(); // Explicitly load the new source
      } catch (error) {
          console.error("Error setting preview audio source:", error);
      }
    };

    setAudioSource();

    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [selectedSound, customFile]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    const audioEl = previewAudioRef.current;
    if (!audioEl) return;

    audioEl.volume = newVolume / 100;

    // Only play if the audio element has loaded at least its metadata
    if (audioEl.readyState > 0) {
        audioEl.currentTime = 0;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.warn("Audio preview was blocked. Click the page to enable.");
                } else {
                    console.error("Audio preview failed:", error);
                }
            });
        }
    }

    // Stop the preview after a short time
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = window.setTimeout(() => {
      if (audioEl) {
          audioEl.pause();
      }
    }, 1500);
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSound && !customFile) {
        alert("Please select a sound or upload a file.");
        return;
    }
    const soundToSet: LibrarySound = customFile ? { name: 'Custom', url: '', status: 'DOWNLOADED' } : selectedSound!;
    onSetAlarm(time, questions, soundToSet, customFile, volume);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFile(file);
      setFileName(file.name);
      setSelectedSound(null);
      setIsSoundPickerOpen(false);
    }
  };
  
  const pickerButtonText = customFile ? fileName : selectedSound?.name || 'Select a sound...';

  if (isAlarmSet) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-green-400">Alarm is Set!</h2>
            <p className="text-lg mt-2">Wake up time: <span className="font-bold text-orange-400">{alarmTime}</span></p>
            <button
                onClick={onCancelAlarm}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
                Cancel Alarm
            </button>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="alarm-time">Alarm Time</Label>
        <input
          type="time"
          id="alarm-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="bg-slate-700 border border-slate-600 text-white text-lg rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
        />
      </div>
      <div>
        <Label htmlFor="num-questions">Math Questions (3-20)</Label>
        <input
          type="number"
          id="num-questions"
          min="3"
          max="20"
          value={questions}
          onChange={(e) => setQuestions(parseInt(e.target.value, 10))}
          required
          className="bg-slate-700 border border-slate-600 text-white text-lg rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
        />
      </div>
      <div>
        <Label htmlFor="alarm-volume">Alarm Volume: {volume}%</Label>
        <input
          type="range"
          id="alarm-volume"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg"
        />
      </div>
      <div ref={soundPickerRef}>
        <Label>Alarm Sound</Label>
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsSoundPickerOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-700 text-white rounded-lg border border-slate-600 hover:bg-slate-600 text-left"
            >
                <span className="truncate">{pickerButtonText}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-5 h-5 ml-2 transition-transform duration-200 ${isSoundPickerOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
                </svg>
            </button>

            {isSoundPickerOpen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3 p-3">
                        {soundLibrary.map((sound) => (
                          <div
                            key={sound.name}
                            onClick={() => {
                              setSelectedSound(sound);
                              setCustomFile(null);
                              setFileName('');
                              setIsSoundPickerOpen(false);
                            }}
                            className={`
                              aspect-square p-3 rounded-lg border-2
                              flex flex-col items-center justify-between cursor-pointer
                              transition-all duration-200 text-center
                              ${selectedSound?.name === sound.name ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'}
                            `}
                          >
                            <span className="text-sm font-medium text-slate-200">{sound.name}</span>
                            <SoundActionButton 
                                sound={sound} 
                                onDownload={(e) => { e.stopPropagation(); onDownload(sound); }} 
                                onDelete={(e) => { e.stopPropagation(); onDelete(sound); }}
                            />
                          </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
       <div>
        <Label htmlFor="custom-sound">Or Upload Your Own</Label>
        <label className={`w-full flex items-center px-4 py-2.5 bg-slate-700 text-white rounded-lg border cursor-pointer hover:bg-slate-600 ${customFile ? 'border-orange-500' : 'border-slate-600'}`}>
            <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" />
            </svg>
            <span className="truncate">{fileName || 'Choose a file...'}</span>
            <input type='file' id="custom-sound" className="hidden" accept="audio/*" onChange={handleFileChange} />
        </label>
      </div>
      <button
        type="submit"
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 text-lg"
      >
        Set Alarm
      </button>
      <audio ref={previewAudioRef} hidden />
    </form>
  );
};
