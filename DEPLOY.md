# Driftsättning på Hetzner-VPS:en

Servern kör redan två andra appar som INTE ska röras:
`kundtjanst.mobelmastarna.se` (CRM:et, systemd-tjänst `crm-app`) och
`app.mobelmastarna.se/social-media` (Instagram-innehållsappen, systemd-
tjänst `inspirationscontent`, port 3000). Reverse-proxyn är **Caddy**
(inte nginx - nginx finns installerat men är inaktivt/oanvänt).

Feed-appen läggs till vid sidan av dessa: egen systemanvändare, egen
mapp, egen systemd-tjänst, port 3020, och två nya `handle`-block i den
befintliga `app.mobelmastarna.se`-sektionen i Caddyfile.

## 1. Skapa en egen användare

```bash
sudo adduser --disabled-password --gecos "" feedapp
```

## 2. Överför appen till servern

Från din egen dator (i den här mappen):

```bash
rsync -av --exclude node_modules --exclude data --exclude .env . bahz@2.29.21.17:/tmp/feed-app-deploy/
ssh bahz@2.29.21.17 "sudo mv /tmp/feed-app-deploy /home/feedapp/feed-app && sudo chown -R feedapp:feedapp /home/feedapp/feed-app"
```

## 3. Installera beroenden

```bash
ssh bahz@2.29.21.17
sudo -iu feedapp
cd feed-app
npm install --omit=dev
```

## 4. SSH-nyckeln till OpenAI

Den privata SFTP-nyckeln (`openai_feed_sftp`) ligger redan i `~bahz` på
servern. Flytta in den i appens mapp och lås ner rättigheterna:

```bash
exit   # tillbaka till bahz
sudo mv ~/openai_feed_sftp /home/feedapp/feed-app/openai_feed_sftp
sudo chown feedapp:feedapp /home/feedapp/feed-app/openai_feed_sftp
sudo chmod 600 /home/feedapp/feed-app/openai_feed_sftp
rm ~/openai_feed_sftp.pub   # den publika halvan är redan inlagd hos OpenAI, behövs inte längre här
```

## 5. Skapa .env

```bash
sudo -iu feedapp
cd feed-app
cp .env.example .env
node scripts/hash-password.js "välj-ett-starkt-lösenord"   # klistra in raden i .env som FEED_ADMIN_PASSWORD_HASH
nano .env
```

Fyll i:
- `FEED_ADMIN_USER` / `FEED_ADMIN_PASSWORD_HASH` - från raden ovan
- `OPENAI_FEED_SFTP_HOST=sftp.commerce.openai.com`
- `OPENAI_FEED_SFTP_PORT=443`
- `OPENAI_FEED_SFTP_USERNAME=oaiproductfeedprod.fdfd94cee35267416d917b82ccca05ff64324371`
- `OPENAI_FEED_SFTP_REMOTE_PATH=/`
- `OPENAI_FEED_SFTP_PRIVATE_KEY_PATH=/home/feedapp/feed-app/openai_feed_sftp`

(`PORT`/`HOST` kan lämnas som i `.env.example` - `3020`/`127.0.0.1`.)

```bash
chmod 600 .env
exit
```

## 6. Systemd-tjänst

```bash
sudo cp /home/feedapp/feed-app/deploy/feed-app.service /etc/systemd/system/feed-app.service
sudo systemctl daemon-reload
sudo systemctl enable --now feed-app
sudo systemctl status feed-app
```

Loggar: `sudo journalctl -u feed-app -f`

## 7. Caddy - lägg till /feed

Se [`deploy/caddy-snippet.txt`](deploy/caddy-snippet.txt) för exakt vad
som ska läggas till i `/etc/caddy/Caddyfile` (bara två nya `handle`-block
i den befintliga `app.mobelmastarna.se`-sektionen - rör inget annat).

```bash
sudo nano /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 8. Testa

```bash
curl -I https://app.mobelmastarna.se/feed/health
curl -I https://app.mobelmastarna.se/feed/admin          # ska ge 401 utan inloggning
curl -I -u ditt-användarnamn:ditt-lösenord https://app.mobelmastarna.se/feed/admin   # ska ge 200
```

Logga sedan in på `https://app.mobelmastarna.se/feed/admin`, kontrollera
fältmappningen, fyll i `seller_url`/`return_policy` med rätt URL:er, och
klicka **"Kör nu"** för en första körning.

## 9. Uppdatera appen senare

```bash
rsync -av --exclude node_modules --exclude data --exclude .env . bahz@2.29.21.17:/tmp/feed-app-deploy/
ssh bahz@2.29.21.17 "sudo systemctl stop feed-app && sudo rsync -av --exclude data --exclude .env /tmp/feed-app-deploy/ /home/feedapp/feed-app/ && sudo chown -R feedapp:feedapp /home/feedapp/feed-app && sudo -u feedapp bash -c 'cd /home/feedapp/feed-app && npm install --omit=dev' && sudo systemctl start feed-app"
```

## Backup

Allt appen lagrar (källkonfiguration, fältmappning, senaste CSV,
körningshistorik) ligger i `data/` - inga hemligheter där (SFTP-nyckeln
och lösenordshashen ligger i `.env`/`openai_feed_sftp`, separat). En
enkel cron-rad räcker om ni vill säkerhetskopiera det:

```bash
0 3 * * * tar -czf /home/feedapp/backups/data-$(date +\%F).tar.gz -C /home/feedapp/feed-app data
```
