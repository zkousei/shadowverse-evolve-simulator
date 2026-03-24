const DECKLOG_API_BASE = 'https://decklog.bushiroad.com/system/app/api/view/';

const isValidDeckCode = (value) => /^[A-Za-z0-9-]+$/.test(value);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const deckCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

  if (!deckCode || !isValidDeckCode(deckCode)) {
    return res.status(400).json({ error: 'Invalid DeckLog code' });
  }

  try {
    const upstreamResponse = await fetch(`${DECKLOG_API_BASE}${deckCode}`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://decklog.bushiroad.com',
        Referer: `https://decklog.bushiroad.com/view/${deckCode}`,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
    });

    const text = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8';

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'Failed to reach DeckLog' });
  }
}
