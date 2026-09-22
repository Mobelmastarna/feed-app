# Produktfeed till OpenAI Ads

Fristående app (inget med CRM:et att göra) som konverterar Möbelmästarnas
Google Shopping-produktfeed (XML) till en CSV enligt
[OpenAIs produktschema](https://developers.openai.com/commerce/specs/file-upload/products)
och skickar den via **SFTP** till OpenAI Ads varje natt kl 01:00 (svensk
tid, sommartid hanteras automatiskt).

**Viktigt:** OpenAI Ads hämtar inte feeden från en URL - de tar bara emot
filer som laddas upp via SFTP-push. Appens publika del (`/feed`) visar
därför ingen information alls; all hantering sker bakom ett
lösenordsskyddat gränssnitt på **`/feed/admin`**.

## Funktioner

- **Källa**: URL:en till Google-feeden, redigerbar i gränssnittet om den
  någonsin ändras hos e-handeln.
- **Fältmappning**: varje OpenAI-kolumn (`item_id`, `title`, `price`,
  `availability`, ...) mappas antingen till ett fält i källfeeden (t.ex.
  `g:id`), ett fast värde som gäller för alla produkter (t.ex.
  `seller_name`), eller källfältet med ett fast värde som reserv om det
  är tomt. "Hämta fältnamn från källan" läser bara de första produkterna
  (strömmande) för att lista tillgängliga `g:`-taggar utan att ladda ner
  hela filen (~20 MB).
- **Lagerstatus & pris**: `g:availability` ("in stock"/"preorder"/...)
  normaliseras automatiskt till OpenAIs `in_stock`/`out_of_stock`/
  `pre_order`/`backorder`/`unknown`. Pris/reapris ("123.00 SEK") matchar
  redan OpenAIs format.
- **Körning**: schemalagd varje natt (inbyggd schemaläggare, ingen extern
  cron behövs) + en "Kör nu"-knapp i gränssnittet, med körningshistorik,
  varningar och en länk för att ladda ner senaste CSV:n för manuell
  kontroll.
- **Inloggning**: HTTP Basic Auth mot ett enda admin-konto
  (`FEED_ADMIN_USER` / `FEED_ADMIN_PASSWORD_HASH`, bcrypt-hashat). Helt
  fristående från CRM:ets Supabase Auth.
- **Lagring**: enkla JSON-/CSV-filer i `data/` - ingen databas behövs.

## Lokal utveckling

```bash
npm install
cp .env.example .env
node scripts/hash-password.js "välj-ett-lösenord"   # klistra in resultatet i .env
# redigera .env
npm start
```

Öppna `http://localhost:3020/feed/admin` (logga in med `FEED_ADMIN_USER`
och lösenordet du hashade ovan).

## Driftsättning

Se [`DEPLOY.md`](DEPLOY.md) för hur appen läggs upp på Hetzner-VPS:en
bredvid CRM:et (`kundtjanst.mobelmastarna.se`) och social-media-appen
(`app.mobelmastarna.se/social-media`) utan att röra någon av dem.

## Struktur

```
server.js                  Entry point - Express, mountar allt under /feed
src/
  auth.js                   HTTP Basic Auth (bcrypt)
  store.js                  Fil-baserad lagring (data/config.json, latest.csv, runs.json)
  targetFields.js            OpenAI-fältkatalogen (mappnings-UI:ts källa)
  fetchAndParseSource.js      Hämtar/parsar källfeeden (fulla + "discover"-läge)
  mapItem.js                  Applicerar fältmappning + normaliserar availability/pris
  buildCsv.js                  CSV-serialisering enligt OpenAIs citeringsregler
  sftp.js                       SFTP-uppladdning till OpenAI
  runFeedSync.js                 Orkestrerar en hel körning
  scheduler.js                    node-cron, 01:00 Europe/Stockholm
  routes/admin.js                  HTML-gränssnitt + API-endpoints
scripts/hash-password.js    Genererar bcrypt-hash för .env
```
