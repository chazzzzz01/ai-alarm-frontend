'use client';

import React, { useState, useEffect, useRef } from 'react';

type AlarmResponse = {
  status: 'success' | 'error';
  message?: string;
  alarm_time?: string;
  reason?: string;
};

export default function Home() {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<AlarmResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Store timer IDs for cleanup
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const showNotification = (reason: string) => {
    if (Notification.permission === 'granted') {
      new Notification('⏰ Alarm', {
        body: reason || 'Time is up!',
        icon: '/alarm.png', // Make sure this file exists in public folder
      });
    } else {
      alert(reason || 'Time is up!');
    }
  };

  const scheduleLocalAlarm = (alarmTime: string, reason: string) => {
    // Clear any existing timers before scheduling new ones
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Handle repeating alarms like "every 30 minutes"
    const repeatingMatch = alarmTime.match(/every\s+(\d+)\s+(second|seconds|minute|minutes|hour|hours)/i);
    if (repeatingMatch) {
      const value = parseInt(repeatingMatch[1], 10);
      const unit = repeatingMatch[2].toLowerCase();

      let ms = 0;
      if (unit.startsWith('second')) ms = value * 1000;
      else if (unit.startsWith('minute')) ms = value * 60 * 1000;
      else if (unit.startsWith('hour')) ms = value * 60 * 60 * 1000;

      if (ms > 0) {
        // Schedule repeated notifications every ms milliseconds
        intervalRef.current = window.setInterval(() => showNotification(reason), ms);
        return;
      }
    }

    // Handle absolute time alarms (ISO format or parseable date)
    const targetDate = new Date(alarmTime);
    if (isNaN(targetDate.getTime())) {
      // Invalid date string
      console.warn('Invalid alarm time:', alarmTime);
      return;
    }

    const delay = targetDate.getTime() - Date.now();

    if (delay > 0 && delay < 86400000) { // only schedule if within 24h
      timeoutRef.current = window.setTimeout(() => showNotification(reason), delay);
    }
  };

  const handleSetAlarm = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const apiURL = "https://mobileaialarmclock-production.up.railway.app";

      const res = await fetch('/api/set-alarm', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Alarm service responded with error');
      }

      const data: AlarmResponse = await res.json();
      setResponse(data);

      if (data.status === 'success') {
        scheduleLocalAlarm(data.alarm_time || '', data.reason || '');
      }
    } catch (error: any) {
      console.error('Alarm fetch failed:', error);

      const isNetworkError =
        error.message === 'Failed to fetch' ||
        error.message.includes('NetworkError');

      setResponse({
        status: 'error',
        message: isNetworkError
          ? '⚠️ Could not reach the alarm server. Check if it is deployed and allows CORS.'
          : error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
      <div className="w-full max-w-md glass p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">AI Alarm Clock</h1>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Set alarm to drink water every 30 minutes"'
          className="w-full p-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/70 mb-4"
          aria-label="Alarm command input"
        />

        <button
          onClick={handleSetAlarm}
          disabled={loading || text.trim() === ''}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded transition"
          aria-busy={loading}
        >
          {loading ? 'Setting Alarm...' : 'Set Alarm'}
        </button>

        {response && (
          <div className="mt-4 text-sm" role="alert">
            {response.status === 'success' ? (
              <div className="text-green-300">
                ✅ Alarm set successfully!
                <div>
                  ⏰ Alarm Time:{' '}
                  <span className="font-mono">{response.alarm_time}</span>
                </div>
                <div>📌 Reason: {response.reason}</div>
                <div className="text-xs text-white/50 mt-2">
                  (Browser alarm will notify you)
                </div>
              </div>
            ) : (
              <div className="text-red-400">
                ❌ {response.message || 'Something went wrong'}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
