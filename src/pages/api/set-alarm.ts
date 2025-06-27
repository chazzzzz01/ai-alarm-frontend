// pages/api/set-alarm.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const fastApiURL = 'https://mobileaialarmclock-production.up.railway.app/set-alarm';

  try {
    const response = await fetch(fastApiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to contact AI Alarm API.' });
  }
}

