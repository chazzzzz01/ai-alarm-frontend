'use client';
import { useState, useEffect } from 'react';

// ✅ Define the response type
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

  // Ask for Notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  // Show alarm notification
  const showNotification = (reason: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ Alarm', {
        body: reason || 'Time is up!',
        icon: '/alarm.png',
      });
    } else {
      alert(reason); // fallback
    }
  };

  const scheduleLocalAlarm = (alarmTime: string, reason: string) => {
    if (alarmTime.includes('every')) {
      const match = alarmTime.match(/every (\d+) (second|minute|hour)/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];

        let milliseconds = 0;
        if (unit.includes('second')) milliseconds = value * 1000;
        if (unit.includes('minute')) milliseconds = value * 60 * 1000;
        if (unit.includes('hour')) milliseconds = value * 60 * 60 * 1000;

        setTimeout(() => showNotification(reason), milliseconds);
      }
    } else {
      const target = new Date(alarmTime).getTime();
      const now = new Date().getTime();
      const delay = target - now;

      if (delay > 0 && delay < 86400000) {
        setTimeout(() => showNotification(reason), delay);
      }
    }
  };

  const handleSetAlarm = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${process.env.PUBLIC_URL}/set-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Failed to set alarm');

      const data: AlarmResponse = await res.json();
      setResponse(data);

      if (data.status === 'success') {
        scheduleLocalAlarm(data.alarm_time || '', data.reason || '');
      }
    } catch (error) {
      console.error('Alarm error:', error);
      setResponse({ status: 'error', message: 'Failed to connect to backend.' });
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
        />

        <button
          onClick={handleSetAlarm}
          disabled={loading || text.trim() === ''}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded transition"
        >
          {loading ? 'Setting Alarm...' : 'Set Alarm'}
        </button>

        {response && (
          <div className="mt-4 text-sm">
            {response.status === 'success' ? (
              <div className="text-green-300">
                ✅ Alarm set successfully!
                <div>
                  ⏰ Alarm Time: <span className="font-mono">{response.alarm_time}</span>
                </div>
                <div>📌 Reason: {response.reason}</div>
                <div className="text-xs text-white/50 mt-2">(Browser alarm will notify you)</div>
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
