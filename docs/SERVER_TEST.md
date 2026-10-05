# Deinen Affiliate-Bot auf dem eigenen Server testen

Stand: 30.09.2026, v0.4.1. Dieser Ablauf testet **Produktlink → eigener Affiliate-Link** und die automatische Antwort im Chat. Keine Creators API, keine Preise, keine Amazon-Zugangsdaten erforderlich. Das ist ein kontrollierter Praxistest, keine öffentliche oder rechtliche Freigabe.

## 1. Den richtigen Projektstand verwenden

Verwende den Branch `feat/api-free-products-20260929` aus Pull Request #1. `main` enthält die neuen Funktionen noch nicht.

Am einfachsten ist das Artefakt **amazon-server-test** aus dem zu diesem Stand gehörenden erfolgreichen GitHub-Actions-Lauf. Es enthält den Quellcode und genau die im Lauf aufgelöste `package-lock.json`, aber keine Tokens, `.env`, Datenbank oder installierten Abhängigkeiten. `TEST_BUNDLE.txt` nennt den geprüften Checkout, den CI-Lauf und den Hash der Lockdatei. Die automatische Bereitstellung ersetzt keinen Discord-Praxistest. Das Artefakt wird 14 Tage aufbewahrt.

Alternativ mit Git:

```sh
git clone --branch feat/api-free-products-20260929 https://github.com/Duy-Phan96/amazon-affiliate-discord-bot.git
cd amazon-affiliate-discord-bot
```

Authentifiziere dich bei GitHub über deinen normalen lokalen Weg, nicht durch Zugangsdaten im Chat. Bei einem vorhandenen Checkout zuerst lokale Änderungen sichern; nicht blind zurücksetzen. Der Git-Stand hat noch keine dauerhaft eingecheckte, geprüfte Lockdatei. Nur dort zuerst `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` ausführen; im CI-Artefakt diesen Schritt auslassen, damit dessen geprüfte Auflösung erhalten bleibt.

## 2. Eigene Discord-Anwendung und Testkanal

Öffne das [Discord Developer Portal](https://discord.com/developers/applications). Erstelle eine **separate** Anwendung, beispielsweise `Amazon Affiliate Test`. Verwende nicht den Token deines bestehenden GamerHQ-Bots.

Notiere aus **General Information** die Application ID. Im Bereich **Bot** erzeugst/kopierst du den Bot-Token ausschließlich lokal. Unter **Privileged Gateway Intents** aktivierst du **Message Content Intent** und speicherst. Server Members Intent und Presence Intent werden für diesen Test nicht verlangt. Unser Client fordert Message Content an; ein nicht freigeschalteter Intent kann bereits die Verbindung verhindern.

Aktiviere in Discord unter Benutzereinstellungen → Erweitert den Entwicklermodus. Rechtsklick auf deinen Server → **Server-ID kopieren**. Erstelle dort einen normalen Textkanal, z. B. `#amazon-bot-test`, am Anfang nur für dich bzw. freiwillige Tester sichtbar. Nutze zunächst keinen Forum-Thread, Sprach- oder Ankündigungskanal.

Du brauchst **Server verwalten**, um einzurichten und die manuellen Befehle zu verwenden. Der Bot braucht im Testkanal nur **Kanal ansehen, Nachrichten senden, Links einbetten, Nachrichtenverlauf lesen**. Keine Administratorberechtigung, kein Nachrichtenlöschen. Ein normales Mitglied kann später durch einen Chatlink eine automatische Antwort auslösen, ohne Server verwalten zu besitzen.

[Offizielle Discord-Einrichtung](https://docs.discord.com/developers/quick-start/getting-started), [Message Content Intent und Nachrichten](https://docs.discord.com/developers/resources/message), [Befehle und Guild-Registrierung](https://docs.discord.com/developers/interactions/application-commands).

## 3. Lokale .env sicher einrichten

Installiere [Node.js](https://nodejs.org/en/download) 22.12 oder neuer; der Testlauf verwendet Node 22. Öffne das Projektverzeichnis in einem Terminal. In Windows/PowerShell:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

In macOS/Linux kopiere `.env.example` nur, wenn noch keine `.env` existiert. Bearbeite die Datei lokal. Die Felder sind:

```dotenv
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DATABASE_PATH=./data/amazon-test.sqlite
```

Fülle die ersten drei Felder mit Bot-Token, Application ID und Server-ID. Kein Amazon Client Secret, kein Amazon-Token und keine persönliche Tracking-ID gehören hier hinein. Die Tracking-IDs werden später in Discord konfiguriert. Die getrennte Testdatenbank vermeidet die versehentliche Nutzung deiner vorhandenen Bot-Datenbank; deren Verzeichnis wird automatisch erstellt.

`.env` nicht committen, hochladen, abfotografieren oder in Fehlermeldungen kopieren. Bei versehentlicher Veröffentlichung den betroffenen Token im Developer Portal ersetzen. Auch ein privates Repository ist kein Secret-Speicher.

## 4. Prüfen, einladen, Befehle registrieren, starten

Im Projektordner des Testartefakts:

```sh
npm ci
npm run test:tooling
npm run test:core
npm run build
npm test
npm run doctor
```

Nur bei erfolgreichen Prüfungen fortfahren. `doctor` prüft lokal Felder, Node-Version, vorhandenen Build und den Git-Schutz, ohne Credential-Werte zu drucken und ohne Netzwerkanfrage. Bei einer ZIP-Datei gibt es keinen Git-Index; der entsprechende INFO-Hinweis ist kein Tokenfehler. Eine syntaktisch gültige Konfiguration ist noch kein bewiesener Login.

Öffne den von `doctor` ausgegebenen **Invite URL**. Er enthält nur Application-/Server-ID und minimale Rechte, keinen Token. Prüfe den richtigen Server und bestätige die Einladung. Für eine reine private Test-App kann der Public-Bot-Schalter ausgeschaltet bleiben; lade sie als Eigentümer ein. Stelle bei Bedarf im Developer Portal den Installation Context **Guild Install** bereit.

Danach:

```sh
npm run commands:register
npm start
```

Die Registrierung prüft, ob der Token zur Application ID gehört, und aktualisiert nur `/amazon` in diesem Server. Sie registriert nichts global und überschreibt keine anders benannten Befehle. Das Starten des Bots führt keine Befehlsregistrierung mehr aus. Nach Änderungen am Befehlsschema erneut bauen und ausdrücklich registrieren.

Das Terminal zeigt bei Erfolg `bot_ready`. Lasse es geöffnet. Mit gesetzter `DISCORD_GUILD_ID` ignoriert der Bot Nachrichten und Interaktionen anderer Server. Die echte Anmeldung und Rechteprüfung führst **du lokal** aus; sie wurden nicht durch die automatisierten Tests vorweggenommen.

## 5. Affiliate-Modus einrichten

Öffne `/amazon setup` im Server und wähle **Affiliate — my tracking IDs**. Für den ersten Test reichen Deutschland und USA. Hinterlege jeweils die **echte, bereits vorhandene Tracking-ID aus deinem jeweiligen Konto**. Wähle UK nur, wenn du auch diesen Ausgangsmarkt testen möchtest. Der Bot erzeugt keine Auslands-ID durch Ändern einer Endung und kopiert Produkte nicht zwischen Domains.

Wenn OneLink bereits für dein Konto eingerichtet ist, wähle **I configured OneLink**; andernfalls **Use individual IDs**. Der normale Affiliate-Link-Test funktioniert in beiden Fällen. Wähle nur `#amazon-bot-test`. Für den ersten automatischen Test empfehle ich **Reply with affiliate / product link**, weil die Zieladresse sichtbar ist. Später kannst du auf den kompakteren Button wechseln.

Prüfe die Zusammenfassung: **AFFILIATE**, richtige IDs, richtiger Kanal, **REPLY** oder **BUTTON**. Speichere mit **Save configuration**. `/amazon settings` zeigt den gespeicherten Stand.

Informiere die Tester im Kanal, dass der Bot auf ungetaggte Produktlinks mit gekennzeichneten Affiliate-Links antwortet. Prüfe außerdem, ob die konkrete Discord-/Site-Nutzung für dein Amazon-Konto akzeptiert ist; ein privater Test und die Bot-Kennzeichnung ersetzen diese Prüfung nicht. Amazon verlangt zusätzlich eine Partnererklärung am verwendeten Account-/Site-Auftritt. [Offizielle Kennzeichnungshinweise](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98), [Teilnahmevereinbarung](https://partnernet.amazon.de/help/operating/agreement/), [Programmrichtlinien](https://partnernet.amazon.de/help/operating/policies/).

## 6. Drei Funktionstests

### A. Produktlink direkt umwandeln

Öffne ein echtes Produkt auf Amazon.de und kopiere dessen **vollständige Produktadresse**. Starte `/amazon link` und füge diese beim Feld `url` ein.

Erwartung: eine nur für dich sichtbare Antwort, ein kopierbarer Link mit **genau einer** `tag`-Zuordnung zu deiner DE-ID, eine Kennzeichnung und ein Amazon-Button. Kein Titel und kein Empfehlungstext sind Pflicht. Es wird nichts öffentlich gepostet. Bei Affiliate-Links die Kennzeichnung mit übernehmen, wenn du den Link kopierst.

Dieser Test zeigt die korrekte **Link-Erzeugung**, nicht die Gültigkeit deines Partnerkontos oder eine zugesicherte Provision. Ein bloßer Produktname ist nicht ausreichend: Produktsuche kommt erst später mit einem geeigneten Provider. `amzn.to` und `amzn.eu` zuerst selbst öffnen und die vollständige Produktadresse aus dem Browser verwenden.

### B. Automatische Antwort auf einen Chatlink

Poste eine neue normale Nachricht mit einem vollständigen Amazon.de-Produktlink **ohne bereits enthaltenen `tag`-Parameter** im Testkanal. Auch ein gewöhnliches Testmitglied kann das tun.

Erwartung: Der Bot antwortet mit deinem Affiliate-Link und Kennzeichnung; der Originalbeitrag bleibt unverändert. Bei BUTTON steckt die Zieladresse im Button, bei REPLY steht sie im Text. Außerhalb der gewählten Kanäle oder bei OFF folgt keine Antwort. Bots und Webhooks werden ignoriert.

Bereits getaggte Links werden absichtlich nicht automatisch neu zugeordnet — auch nicht deine eigenen. Verwende für diesen Test deshalb einen ungetaggten Original-Produktlink. Der ausdrückliche `/amazon link`-Befehl ist davon getrennt und kann auf deine Anforderung einen neuen Link erstellen.

Pro Nachricht erscheint höchstens eine Antwort auf einen passenden Link aus den ersten zehn gefundenen URLs. Für dasselbe Produkt im selben Kanal gilt eine Sperre von 60 Sekunden. Für wiederholte Tests verwende ein anderes echtes Produkt oder warte die Sperre ab. Frühere Nachrichten werden nicht nachträglich gescannt.

### C. Produktpost mit Vorschau

Öffne `/amazon product`, füge den Produktlink ein, lasse Titel/Text leer oder schreibe einen eigenen Empfehlungstext. Wähle den Testkanal, prüfe die private Vorschau, dann **Publish product**. Die Kennzeichnung bleibt fest dabei. **Cancel** postet nichts. Es werden keine Livepreise oder Bilder abgerufen.

## 7. OneLink separat testen

Ein DE-Link, den du aus Deutschland öffnest, ist noch kein Nachweis einer internationalen Weiterleitung. Ebenso beweist ein im Bot gespeichertes Häkchen keine aktive OneLink-Verbindung.

Amazon beschreibt für das **vereinfachte US-OneLink** eine einmalige Einrichtung, Regeln pro Tracking-ID und **Check Matching Products** zur Zielprüfung eines US-Produktlinks. Das ist nicht automatisch eine Zusage für beliebige deutsche Links oder jede Discord-Konfiguration. [US-FAQ und Link-Matching](https://affiliate-program.amazon.com/help/node/topic/G4CL4623QZAVGV7A).

Für einen nachvollziehbaren Test in Deutschland:

1. Öffne OneLink in deinem zugehörigen Amazon-Konto und kontrolliere, dass die verwendete Ausgangs-Tracking-ID und Deutschland als Ziel korrekt eingerichtet sind. Bei mehreren IDs die passende prüfen. Bereits vorhandene internationale Konten nicht neu anlegen oder überschreiben.
2. Öffne ein **tatsächlich auf Amazon.com vorhandenes Produkt**. Tausche nicht einfach die Domain eines DE-Links aus. Erzeuge dafür über `/amazon link` den Link mit deiner konfigurierten US-ID.
3. Nutze **Check Matching Products**, sofern deinem Konto angeboten, um das erwartete lokale Ziel zu prüfen. Veröffentliche bei Bedarf den selben Produktlink über `/amazon product` im Testkanal und öffne den ausgegebenen Bot-Link bewusst einmal aus Deutschland. Notiere Ausgangsmarkt und tatsächliches Ziel.
4. Vergleiche bei Problemen einen von Amazon selbst erzeugten vollständigen Affiliate-Link für dasselbe US-Produkt und dieselbe ID unter denselben Bedingungen. Das hilft, Konto-/Produktzuordnung und Bot-Link voneinander zu unterscheiden; es ist ein Testvorschlag, keine Zusage, dass Discord für dein Konto freigegeben ist.

Amazons Einrichtungswege unterscheiden sich nach Ausgangsprogramm und Zielmärkten: [aktueller Integrationsleitfaden](https://affiliate-program.amazon.com/help/node/topic/GKHRXG4YEJBTCAFC), [vereinfachter US-Start](https://affiliate-program.amazon.com/help/node/topic/GURY9HX6KNJU6LQE), [allgemeine OneLink-FAQ](https://affiliate-program.amazon.com/help/node/topic/G8JHEWQ9GTDUN7EH). Dein [deutscher PartnerNet-Link](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC) bleibt als Einstieg enthalten; er war beim öffentlichen Abruf nicht vollständig lesbar. Prüfe ihn angemeldet oder über den Amazon-Support.

**Auswertung:** Der Bot-Link kann technisch richtig sein, auch wenn keine Weiterleitung beobachtet wird. Ein richtiges lokales Ziel beweist wiederum noch keine Provisionsgutschrift. Behandle **Link korrekt**, **Weiterleitung beobachtet** und **Attribution/Umsatz bei Amazon bestätigt** als getrennte Ergebnisse. Eine fehlende sichtbare `tag`-Angabe nach weiteren Browser-/App-Schritten ist allein kein verlässlicher Abrechnungstest. Zur Abrechnung sind die tatsächlichen Amazon-Berichte maßgeblich, nicht unsere UI.

Für diesen Funktionstest ist kein Kauf nötig. Keine Eigenbestellungen als Provisionstest, keine künstlichen Klickserien und keine Testkäufe zur Erfüllung von API-Schwellen organisieren. Creators-API-Berechtigung ist nicht Teil dieses Tests.

## 8. Fehler eingrenzen und stoppen

| Beobachtung | Nächster Schritt |
| --- | --- |
| `/amazon` fehlt | Richtige Anwendung eingeladen? Richtige Guild-ID? Build und `commands:register` erfolgreich? Hast du Server verwalten? Discord neu laden. |
| Login scheitert / Intent-Fehler | Message Content Intent in genau dieser Bot-Anwendung aktivieren; Token und Application ID lokal prüfen. |
| `/amazon link` funktioniert, Chat schweigt | Kanal ausgewählt? REPLY/BUTTON statt OFF? Neuer vollständiger Link ohne Tag? 60-Sekunden-Sperre? Rechte und Intent prüfen. |
| Marketplace nicht aktiv / ID fehlt | Den passenden Originalmarkt im Setup mit echter ID ergänzen. Keine ID-Endung erfinden. |
| Kurzlink oder Produktname abgelehnt | Vollständige Produktadresse kopieren; keine Produktsuche in V1. |
| OneLink leitet nicht um | Separaten Ablauf oben nutzen. Nicht die Produktdomain im Code ersetzen. |
| Zustellung unklar | Zielkanal ansehen, `/amazon status` prüfen; nicht blind erneut veröffentlichen. |
| Test beenden | Ctrl+C im Terminal. Für späteren manuellen Betrieb im Setup automatische Antworten auf OFF setzen. |

Berichte danach nur: **Bot online? Link korrekt? Chatantwort korrekt? OneLink-Ziel? Fehlermeldung ohne Secrets?** Niemals `.env`, Tokens, Cookies oder Screenshots der Credentials-Seite teilen.
