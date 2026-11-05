// Funkcja Vercel: zwraca tymczasowe dane do serwera TURN (przekaźnika WebRTC).
// Klucze trzymamy w zmiennych środowiskowych Vercela, więc nie trafiają do przeglądarki.
//
// Cloudflare (1000 GB/mies. za darmo):  CF_TURN_KEY_ID, CF_TURN_API_TOKEN
// Metered / Open Relay (20 GB/mies.):   METERED_APP (np. "mojaapka"), METERED_API_KEY
// Stały login/hasło TURN (np. Metered):  TURN_USERNAME, TURN_CREDENTIAL, opcjonalnie TURN_HOST

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { CF_TURN_KEY_ID, CF_TURN_API_TOKEN, METERED_APP, METERED_API_KEY } = process.env;

  try {
    if (CF_TURN_KEY_ID && CF_TURN_API_TOKEN) {
      const r = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl: 86400 }),
        },
      );
      if (!r.ok) throw new Error(`Cloudflare odpowiedział ${r.status}`);
      const j = await r.json();
      const iceServers = Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers].filter(Boolean);
      return res.status(200).json({ provider: 'cloudflare', iceServers });
    }

    if (METERED_APP && METERED_API_KEY) {
      const app = METERED_APP.replace(/\.metered\.live.*$/, '').replace(/^https?:\/\//, '');
      const r = await fetch(
        `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`,
      );
      if (!r.ok) throw new Error(`Metered odpowiedział ${r.status}`);
      const iceServers = await r.json();
      return res.status(200).json({ provider: 'metered', iceServers });
    }

    // Stały login/hasło (np. Metered: Credentials → Username / Password)
    const { TURN_USERNAME, TURN_CREDENTIAL } = process.env;
    if (TURN_USERNAME && TURN_CREDENTIAL) {
      const host = process.env.TURN_HOST || 'global.relay.metered.ca';
      const auth = { username: TURN_USERNAME, credential: TURN_CREDENTIAL };
      return res.status(200).json({
        provider: 'static',
        iceServers: [
          { urls: `stun:${host}:80` },
          { urls: `turn:${host}:80`, ...auth },
          { urls: `turn:${host}:80?transport=tcp`, ...auth },
          { urls: `turn:${host}:443`, ...auth },
          { urls: `turns:${host}:443?transport=tcp`, ...auth },
        ],
      });
    }

    return res.status(200).json({ provider: null, iceServers: [] });
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e), iceServers: [] });
  }
};
