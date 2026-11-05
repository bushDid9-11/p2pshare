# P2P Share

Wysyłanie plików bezpośrednio między przeglądarkami (WebRTC + PeerJS) w sieci domowej.

## Uruchomienie

```bash
cd ~/dev/p2pshare
npm install
npm start
```

W terminalu pojawią się adresy, np.:

```
Na tym komputerze:   http://localhost:3000
W sieci domowej:     http://192.168.1.23:3000
```

1. Otwórz `http://localhost:3000` na tym komputerze i od razu dostaniesz link do udostępnienia.
2. Dodaj pliki (przeciągnij albo kliknij).
3. Otwórz ten link na drugim komputerze w tym samym Wi-Fi i pobierz pliki.

Serwer służy tylko do serwowania strony i do sygnalizacji (żeby przeglądarki się „znalazły”).
Same pliki lecą bezpośrednio z karty nadawcy do odbiorcy.

## Wersja online (Vercel)

Folder `public/` działa też bez `server.js`. Wtedy strona sama korzysta z darmowego
publicznego serwera sygnalizacyjnego PeerJS (`0.peerjs.com`) i biblioteki z CDN.

Na Vercelu: Add New → Project → import tego repo → Deploy. Ustawienia są w `vercel.json`
(publikowany jest folder `public/`, bez budowania). Każdy push do `main` aktualizuje stronę.

Online pokazywane jest publiczne IP (z api.ipify.org), więc osoby z tej samej sieci mają to samo IP.

### Serwer TURN (potrzebny dla sieci komórkowych)

Operatorzy komórkowi chowają telefony za wspólnym adresem (CGNAT), więc bezpośrednie połączenie
często się nie zestawia i dane muszą iść przez przekaźnik TURN. Funkcja `api/turn.js` pobiera
tymczasowe dane do TURN-a, a klucze leżą w zmiennych środowiskowych Vercela
(Project → Settings → Environment Variables):

- **Cloudflare** (1000 GB/mies. za darmo): `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`
  (Cloudflare dashboard → Realtime → TURN Server → Create)
- albo **Metered**: `METERED_APP` + `METERED_API_KEY`, albo stały login z zakładki Credentials:
  `TURN_USERNAME` + `TURN_CREDENTIAL` (serwer `global.relay.metered.ca`; darmowy trial 500 MB bez karty)

Po dodaniu zmiennych zrób Redeploy. Status połączenia pokazuje „bezpośrednio” albo „przez przekaźnik”.

## Jak to działa

- `server.js` to Express, który serwuje stronę, plus lokalny serwer sygnalizacyjny PeerJS pod `/peerjs`.
- `public/index.html`: strona bez `?s=...` to nadawca, strona z `?s=<id>` to odbiorca.
- Pliki są cięte na kawałki (do 64 KB) i wysyłane po RTCDataChannel z kontrolą bufora (`bufferedAmount`).

## Uwagi

- Karta nadawcy musi być otwarta podczas pobierania.
- Odbiorca składa plik w pamięci przeglądarki, więc pliki rzędu kilku GB wymagają odpowiedniej ilości RAM-u.
- Jeśli drugi komputer nie może się połączyć, sprawdź zaporę w macOS
  (Ustawienia systemowe → Sieć → Zapora) i zezwól na połączenia przychodzące dla `node`.
- Inny port: `PORT=8080 npm start`.
