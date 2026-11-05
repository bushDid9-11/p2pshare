// Serwer: strona aplikacji + lokalny serwer sygnalizacyjny PeerJS.
// Sam plik NIE przechodzi przez ten serwer – leci bezpośrednio między przeglądarkami.

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ExpressPeerServer } = require('peer');

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// Adresy IP tego komputera w sieci lokalnej (np. 192.168.1.23)
function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

app.get('/api/info', (req, res) => {
  res.json({ ips: lanIPs(), port: PORT });
});

// Adres IP, z którego przyszło zapytanie (czyli IP pytającego komputera)
app.get('/api/whoami', (req, res) => {
  let ip = req.socket.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  res.json({ ip });
});

// Biblioteka PeerJS serwowana lokalnie (działa bez internetu).
// Jeśli pliku nie ma, strona sama pobierze ją z CDN.
const peerjsLib = path.join(__dirname, 'node_modules', 'peerjs', 'dist', 'peerjs.min.js');
app.get('/lib/peerjs.min.js', (req, res) => {
  if (fs.existsSync(peerjsLib)) res.sendFile(peerjsLib);
  else res.status(404).end();
});

// no-store: telefony i karty zawsze dostają najnowszą wersję strony
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.set('Cache-Control', 'no-store'),
}));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n  P2P Share działa!\n');
  console.log(`  Na tym komputerze:   http://localhost:${PORT}`);
  for (const ip of lanIPs()) {
    console.log(`  W sieci domowej:     http://${ip}:${PORT}`);
  }
  console.log('\n  Ctrl+C aby zatrzymać.\n');
});

const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: false,
});
app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => console.log('  [+] peer', client.getId()));
peerServer.on('disconnect', (client) => console.log('  [-] peer', client.getId()));
