# Schritt für Schritt: Produktlinks ohne Amazon-API

Stand dieser Anleitung: 29.09.2026. Sie beschreibt den v0.4-Entwicklungszweig. Der vollständige Build und alle 49 automatisierten Tests einschließlich Datenbanktests sind auf GitHub erfolgreich durchgelaufen. Vor öffentlichem Einsatz fehlen noch insbesondere der Discord-Praxistest, eine geprüfte Lockdatei und die Prüfung der konkreten Nutzung; siehe [Entwicklungsstatus](../IMPLEMENTATION_STATUS.md). Die aktuelle V1-Priorität ist API-frei; Creators API kommt später.

## 1. Welcher Modus passt zu dir?

**Basic:** Du möchtest Produkte teilen und brauchst keine Provision. Ein Amazon-Partnerkonto und Tracking-IDs sind dafür keine technische Voraussetzung im Bot. Der Bot veröffentlicht einen normalen Produktlink ohne Affiliate-Tag. Er verändert nicht den ursprünglichen Beitrag eines Mitglieds. Bei gewerblicher oder bezahlter Werbung können trotzdem Kennzeichnungspflichten relevant sein.

**Affiliate:** Du möchtest deine tatsächlich vorhandenen Amazon-Tracking-IDs verwenden. Im Bot werden sie getrennt für Amazon.de, Amazon.com und Amazon.co.uk gespeichert. Der Modus setzt keinen Produkt-API-Zugang voraus. Ein formal richtig aussehender Tag ist keine Bestätigung, dass Amazon dein Konto oder deine konkrete Discord-Nutzung akzeptiert hat.

## 2. Bot starten

Die Installation ist derzeit Self-Hosting, noch kein gehosteter Ein-Klick-Dienst. Installiere Node.js und die Projektabhängigkeiten wie in der README. Erstelle eine Discord-Anwendung und trage Discord-Token und Application-ID ausschließlich in deine lokale `.env` ein. Teile diese Datei nicht. Für automatische Erkennung von Nachrichtentexten ist der Message Content Intent vorgesehen.

Lade den Bot auf einen Testserver ein. Er braucht in den Zielkanälen Sichtbarkeit, Nachrichten senden, Links einbetten und Nachrichtenverlauf lesen, keine Administratorrolle. Die Person, die den Bot konfiguriert und manuell Produktposts veröffentlicht, braucht „Server verwalten“ und Schreibzugriff auf die Zielkanäle.

## 3. Ohne Partnerkonto einrichten

Starte `/amazon setup` und wähle **Basic**. Wähle die gewünschten unterstützten Marktplätze und anschließend einen bis fünf Textkanäle. Wähle **Off**, wenn nur manuelle Produktposts erlaubt sein sollen; **Button** und **Reply** aktivieren zusätzlich die automatische Linkbehandlung in diesen Kanälen.

Prüfe die Zusammenfassung und klicke **Save configuration**. Basic überspringt Partner-IDs und OneLink. Du brauchst weder Client ID noch Client Secret. `/amazon product` öffnet die Produkterstellung.

## 4. Affiliate mit einer oder mehreren eigenen IDs — ohne OneLink

Öffne dein Amazon-Partnerkonto und prüfe dort die tatsächlich verfügbaren Tracking-IDs sowie den Status und die akzeptierten Veröffentlichungsorte. Ermittle die ID für jeden gewünschten Markt im jeweiligen Konto. Kopiere keinen API-Schlüssel und verändere nicht einfach die Endung einer deutschen ID.

Wähle in `/amazon setup` **Affiliate**, anschließend nur die Märkte, für die du eine passende ID hast. Trage die IDs ein. Wähle **Use individual IDs**. Ein einzelner Markt reicht vollständig aus. Wähle Kanäle, Verhalten, prüfe die Werbehinweise und speichere.

Ein deutsches Produkt bleibt ein deutsches Produkt. Ohne konfigurierte US-ID wird nicht heimlich ein deutscher Tag für Amazon.com eingesetzt. Weitere Märkte wie FR, IT, ES, AU und JP sind in diesem Code noch nicht auswählbar; deine dortigen Amazon-Konten werden nicht verändert.

## 5. OneLink optional ergänzen

OneLink ist Amazons Lösung für die Zuordnung internationalen Traffics. Die Einrichtung und verfügbaren Wege hängen von deinem Amazon-Konto und den Zielmärkten ab; siehe [Amazon OneLink FAQ](https://affiliate-program.amazon.com/help/node/topic/G8JHEWQ9GTDUN7EH) und [Integrationsleitfaden](https://affiliate-program.amazon.com/help/node/topic/GKHRXG4YEJBTCAFC).

Öffne zuerst den [OneLink-Eintrag im deutschen PartnerNet](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC) bzw. den OneLink-Bereich in deinem angemeldeten Konto. Wähle dort den für dein Konto angebotenen Einrichtungsweg, verbinde die benötigten Konten/Stores und prüfe Tracking-ID-Zuordnungen, Zielmärkte und Zahlungs-/Kontohinweise. Nutze die von Amazon angebotene Link-/Produktzuordnungsprüfung, sofern sie deinem Konto zur Verfügung steht.

Die [US-Anleitung für das vereinfachte OneLink](https://affiliate-program.amazon.com/help/node/topic/G4CL4623QZAVGV7A) beschreibt eine einmalige Einrichtung, Einstellungen je Tracking-ID und eine Produktzuordnungsprüfung für US-Links. Das ist **keine pauschale Zusage für jeden deutschen Link in Discord**. Der deutsche Leitfaden war bei dieser öffentlichen Quellenprüfung nicht abrufbar; prüfe den tatsächlichen Ablauf im angemeldeten PartnerNet und gegebenenfalls mit dem Amazon-Support.

Erst danach wählst du im Bot **I configured OneLink**. Diese Angabe speichert nur deine Erklärung; der Bot aktiviert nichts in Amazon, prüft weder deine Konten noch Umsätze und garantiert keine Weiterleitung. Die eigenen IDs für die ausgewählten Ausgangsmärkte bleiben erforderlich. OneLink ist eine sinnvolle optionale Ergänzung, wenn Amazon deinen konkreten Weg unterstützt — keine Voraussetzung und kein Ersatz für diese Prüfung.

## 6. Warum die Affiliate-Kennzeichnung?

Wer einen Link anklickt, soll erkennen können, dass eine Provision möglich ist. Amazon verlangt einen verständlichen Hinweis in Linknähe und zusätzlich die Partnererklärung auf der verwendeten Site bzw. beim Social-Media-Konto. Die offizielle Erklärung steht in der [Amazon-Hilfe zur Kennzeichnung](https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98).

Der Bot ergänzt bei Affiliate-Posts fest sichtbare Hinweise. Entferne die erforderliche Kennzeichnung nicht. Hinterlege zusätzlich die vorgeschriebene Partnererklärung gut sichtbar in deinem tatsächlichen Account-/Server-/Website-Auftritt und prüfe, ob diese konkrete Verwendung zulässig ist. Ein Häkchen im Setup ist keine juristische Freigabe. Auch mit späteren Premium-Funktionen muss der Betreiber seine tatsächliche Verwendung prüfen; Werbung wird durch eine Bot-Gebühr nicht automatisch rechtmäßig.

[Amazon Teilnahmevereinbarung](https://partnernet.amazon.de/help/operating/agreement/) und [Programmbedingungen](https://partnernet.amazon.de/help/operating/policies/) sind die offiziellen Ausgangspunkte für die Prüfung. Diese Anleitung ersetzt keine individuelle Rechtsberatung oder Amazon-Freigabe.

## 7. Produkt veröffentlichen

Öffne `/amazon product`. Füge eine vollständige Produkt-URL ein, optional einen selbst geschriebenen Titel und einen kurzen eigenen Empfehlungstext. Bei Affiliate-Posts steht die Kennzeichnung zusätzlich zum eigenen Text. Wähle einen bereits konfigurierten Zielkanal.

Die nächste Nachricht ist nur eine private **Preview**. Prüfe Link, Marketplace, Text, Kennzeichnung und Zielkanal. **Publish product** veröffentlicht; **Cancel** verwirft. Kein Preis und kein Bild wird automatisch abgerufen. Der Hinweis „Community-written, not API-verified“ unterscheidet deinen Text von offiziellen Produktdaten. Eine ohne Bestätigung abgebrochene Produkterstellung postet nichts.

## 8. Wenn etwas nicht funktioniert

Ein abgelaufener Dialog wird neu gestartet. Bei währenddessen geänderten Einstellungen muss ebenfalls neu geprüft werden. Fehlende Kanalrechte müssen in Discord korrigiert werden. Kurzlinks werden noch nicht aufgelöst: öffne sie selbst und kopiere den vollständigen Produktlink.

Bei unklarer Zustellung zuerst den Zielkanal ansehen. Der Bot sendet denselben reservierten Versuch nicht automatisch erneut; `/amazon status` zählt ungeklärte Versuche. Dadurch können Duplikate vermieden werden, eine garantiert genau einmal erfolgte Zustellung lässt sich daraus aber nicht ableiten.

Fehlender Creators-API-Zugriff ist in dieser Version **kein Fehler** und blockiert keinen dieser Schritte.
