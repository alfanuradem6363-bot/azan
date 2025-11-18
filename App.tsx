import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from './components/Clock';
import { AlarmForm } from './components/AlarmForm';
import { QuizModal } from './components/QuizModal';
import { AZAN_SOUNDS } from './constants';
import * as db from './utils/db';
import type { LibrarySound } from './types';

const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState<string | null>(null);
  const [alarmSound, setAlarmSound] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [isAlarmSet, setIsAlarmSet] = useState<boolean>(false);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState<boolean>(false);
  const [alarmVolume, setAlarmVolume] = useState<number>(100);
  const [soundLibrary, setSoundLibrary] = useState<LibrarySound[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const soundObjectUrlRef = useRef<string | null>(null);
  const foregroundAlarmTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const loadSounds = async () => {
      const downloadedKeys = await db.getAllSoundKeys();
      const library: LibrarySound[] = AZAN_SOUNDS.map(sound => ({
        ...sound,
        status: downloadedKeys.includes(sound.name) ? 'DOWNLOADED' : 'NOT_DOWNLOADED'
      }));
      setSoundLibrary(library);
    };

    loadSounds();
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (isAlarmTriggered && audioRef.current && alarmSound) {
      audioRef.current.volume = alarmVolume / 100;
      audioRef.current.src = alarmSound;
      audioRef.current.loop = true;
      audioRef.current.play().catch(error => console.error("Audio play failed:", error));
    } else if (!isAlarmTriggered && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isAlarmTriggered, alarmSound, alarmVolume]);

  useEffect(() => {
    // Cleanup for custom object URL
    return () => {
      if (soundObjectUrlRef.current) {
        URL.revokeObjectURL(soundObjectUrlRef.current);
      }
      // Clear any pending timeout when component unmounts
      if (foregroundAlarmTimeoutRef.current) {
        clearTimeout(foregroundAlarmTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (isAlarmSet && alarmTime) {
      const now = currentTime;
      const alarmDate = new Date(now);
      const [alarmHour, alarmMinute] = alarmTime.split(':').map(Number);
      alarmDate.setHours(alarmHour, alarmMinute, 0, 0);

      if (alarmDate < now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      const diff = alarmDate.getTime() - now.getTime();

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        setTimeRemaining('00:00:00');
      }
    } else {
      setTimeRemaining(null);
    }
  }, [currentTime, alarmTime, isAlarmSet]);

  const updateSoundStatus = useCallback((name: string, status: 'NOT_DOWNLOADED' | 'DOWNLOADING' | 'DOWNLOADED') => {
    setSoundLibrary(prevLibrary => 
      prevLibrary.map(s => s.name === name ? { ...s, status } : s)
    );
  }, []);

  const handleDownload = useCallback(async (sound: LibrarySound) => {
    updateSoundStatus(sound.name, 'DOWNLOADING');
    try {
      const response = await fetch(sound.url);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      const blob = await response.blob();
      await db.saveSound(sound.name, blob);
      updateSoundStatus(sound.name, 'DOWNLOADED');
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed for ${sound.name}. Please check your internet connection.`);
      updateSoundStatus(sound.name, 'NOT_DOWNLOADED');
    }
  }, [updateSoundStatus]);

  const handleDelete = useCallback(async (sound: LibrarySound) => {
    try {
      await db.deleteSound(sound.name);
      updateSoundStatus(sound.name, 'NOT_DOWNLOADED');
    } catch (error) {
      console.error('Failed to delete sound:', error);
    }
  }, [updateSoundStatus]);

  const clearAlarmState = useCallback(() => {
    if (foregroundAlarmTimeoutRef.current) {
      clearTimeout(foregroundAlarmTimeoutRef.current);
      foregroundAlarmTimeoutRef.current = null;
    }
    setAlarmTime(null);
    setIsAlarmSet(false);
    setIsAlarmTriggered(false);
  }, []);

  const handleSetAlarm = useCallback(async (time: string, questions: number, sound: LibrarySound, customFile: File | null, volume: number) => {
    // Clear any previous alarm state
    clearAlarmState();
    
    setAlarmTime(time);
    setNumQuestions(questions);
    setAlarmVolume(volume);

    if (soundObjectUrlRef.current) {
        URL.revokeObjectURL(soundObjectUrlRef.current);
    }

    let soundUrlForPlayback: string;
    try {
      if (customFile) {
          soundUrlForPlayback = URL.createObjectURL(customFile);
          soundObjectUrlRef.current = soundUrlForPlayback;
      } else if (sound.status === 'DOWNLOADED') {
          const blob = await db.getSound(sound.name);
          if (blob) {
              soundUrlForPlayback = URL.createObjectURL(blob);
              soundObjectUrlRef.current = soundUrlForPlayback;
          } else {
              console.error("Could not find downloaded sound, streaming instead.");
              soundUrlForPlayback = sound.url;
          }
      } else {
          soundUrlForPlayback = sound.url;
      }
      setAlarmSound(soundUrlForPlayback);
      setIsAlarmSet(true);

      // Set a precise timer for foreground alarm
      const now = new Date();
      const alarmDate = new Date();
      const [alarmHour, alarmMinute] = time.split(':').map(Number);
      alarmDate.setHours(alarmHour, alarmMinute, 0, 0);
      if (alarmDate <= now) {
          alarmDate.setDate(alarmDate.getDate() + 1);
      }
      const timeoutDuration = alarmDate.getTime() - now.getTime();
      if (timeoutDuration > 0) {
          foregroundAlarmTimeoutRef.current = window.setTimeout(() => {
              setIsAlarmTriggered(true);
          }, timeoutDuration);
      }

      console.log(`Alarm set for ${time} with sound ${sound.name} and ${questions} questions at volume ${volume}%.`);
    } catch (error) {
        console.error("Error setting alarm:", error);
        alert("There was an error setting the alarm. Please try again.");
        clearAlarmState();
    }
  }, [clearAlarmState]);
  
  const handleQuizComplete = useCallback(() => {
    console.log('Quiz complete. Alarm off.');
    clearAlarmState();
  }, [clearAlarmState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-orange-400">Azan Math Alarm</h1>
          <p className="text-slate-300 mt-2">Wake up sharp, stay on time.</p>
        </header>

        <Clock 
          currentTime={currentTime} 
          isAlarmSet={isAlarmSet}
          timeRemaining={timeRemaining}
        />

        <div className="w-full bg-slate-800/50 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-slate-700 mt-8">
            <AlarmForm 
                onSetAlarm={handleSetAlarm}
                onCancelAlarm={clearAlarmState}
                isAlarmSet={isAlarmSet}
                alarmTime={alarmTime}
                soundLibrary={soundLibrary}
                onDownload={handleDownload}
                onDelete={handleDelete}
            />
        </div>
      </div>
      
      {isAlarmTriggered && (
        <QuizModal 
          numQuestions={numQuestions}
          onComplete={handleQuizComplete}
        />
      )}
      <audio ref={audioRef} />
    </div>
  );
};

export default App;
