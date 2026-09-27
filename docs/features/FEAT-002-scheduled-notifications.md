# Tijdgestuurde notificaties

`checkScheduledNotifications` evalueert elk uur de regels in
`infrastructure/notification/scheduled-notification-rules.js`. Iedere rule is een
eigen object in `infrastructure/notification/rules/`, met selectie, fingerprint
en berichtopbouw bij elkaar. Gedeelde gig-helpers staan in
`rules/gig-notification-rule-helpers.js`. Per uitvoering
wordt iedere benodigde bronsheet eenmaal gelezen. De handler gebruikt een
scriptlock; fouten worden per regel en record gelogd. De controle wijzigt geen
gigvelden, syncstatussen of Calendar-events.

## Regels

- `GIG_OPTION_EXPIRES_TODAY`: `OPTION`, vervaldatum vandaag, vanaf 09:00.
  De bestaande datumfingerprint blijft behouden. Het meldtijdstip blijft
  instelbaar via `CONFIG.entities.gig.optionExpiry.notificationTime`.
- `GIG_INVOICE_NEEDS_TO_BE_SENT`: uitsluitend `CONFIRMED`, Gig Date gisteren, vanaf 09:00.
  Start/eindtijd en factuurstatus spelen geen rol. Een vaste fingerprint betekent
  eenmaal per Gig ID en abonnee, ook na een latere wijziging van de gigdatum.

Beide regels sluiten `DELETE_REQUESTED` en `DELETED` uit; overige syncstatussen
zijn toegestaan. Een Gig ID is verplicht. Datumvelden moeten echte Sheet-datums
zijn. Alle kalendervergelijkingen gebruiken de scripttijdzone Europe/Brussels.
Er worden geen controles van eerdere dagen ingehaald. Een al klaargezette
notificatie kan wel later via de bestaande worker worden afgeleverd.

Notify verzorgt eventactivatie, abonnementen, deduplicatie en afleverretries.
Bewaar de queuehistorie: het verwijderen van items verwijdert ook hun
deduplicatiehistorie. Ook FAILED-items blokkeren opnieuw klaarzetten met dezelfde
sleutel. Een klaargezet bericht wordt niet ingetrokken na annulering of wijziging
van de gig. Exact eenmalige aflevering wordt niet gegarandeerd.

## Ingebruikname na goedgekeurde codepublicatie

1. Voeg `GIG_INVOICE_NEEDS_TO_BE_SENT` toe aan `event-list` en activeer het event.
2. Voeg de gewenste ontvangers toe aan `event-subscriptions`. De bestaande
   ontvangerproperties en notificatie-worker blijven nodig.
3. Kies `Triggers > Installeer notificatiecontrole`. De installer maakt de nieuwe
   uurtrigger aan en verwijdert bestaande generieke en legacy optietriggers van
   het uitvoerende account. Bij een aanmaakfout blijven oude triggers intact.
4. Controleer `Scheduled Notifications` en `Notification Worker` in `system-status`.
   Deze status bewijst triggeraanwezigheid, niet geslaagde uitvoering.
5. Controleer met expliciete toestemming een afgesproken testgig, queue en
   aflevering; dit kan echte notificaties versturen.

Geen nieuwe kolommen of librarywijzigingen zijn nodig. Bestaande opties en
queue-items blijven behouden. Tot migratie werkt `checkGigOptionExpiry` nog als
compatibiliteitshandler voor uitsluitend de optieregel. De legacy installer
`installGigOptionExpiryTrigger` installeert voortaan de generieke controle.
Gebruik het nieuwe menu om beide soorten controletriggers te verwijderen.

## Handmatig controleren

Als admin kun je via `MQT Gig Sync > Notificaties > Controleer tijdgestuurde notificaties`
dezelfde controle direct starten. Ook handmatig gelden de datumvoorwaarden,
het meldtijdstip vanaf 09:00 en deduplicatie. Dit is geen dry-run: passende
notificaties worden in de echte queue geplaatst en door de worker afgeleverd.

## Nieuwe regel toevoegen


Definieer de eventcode centraal in `NOTIFICATION_EVENTS` en gebruik die constante
in de regel. Maak een eigen rule-object in een bestand onder `rules/` en registreer
dat object in `getAll()`. De rule bevat een unieke `id` en `eventCode`, `enabled`,
`entity`, `notificationTime`, `requiredColumns`, `evaluate` en `createMessage`.
`requiredColumns` bevat keys uit de entity-configuratie, geen kolomnummers.
`evaluate(record, context)` retourneert null of een payload met `sourceId` en
`fingerprintValues` (een niet-lege array), plus berichtvelden. De context bevat
`zone`, `today` en `yesterday` als lokale kalenderdatums. Evaluatie heeft zelf
geen side effects. `createMessage(payload)` retourneert `{ title, message }`.
De message factory vindt de regel via de eventcode; een nieuwe switch-case,
trigger of wijziging in de uitvoeringsservice is niet nodig.

Registreer vervolgens het event en de abonnementen in de bestaande Sheets.
Test datumgrenzen, selectie, fingerprint en berichttekst. Een wijziging van
`CONFIG.notifications.schedule.everyHours` vereist herinstallatie van de trigger;
regelwijzigingen worden bij de volgende uitvoering gebruikt.

Lees externe constanten en configuratie pas in functies of getters, zoals de
bestaande rules doen. Dit voorkomt afhankelijkheid van bestandslaadvolgorde.
Het register retourneert nieuwe definities met actuele configuratiewaarden.
Voeg het nieuwe rule-bestand ook toe aan de relevante lokale testsuites.

## Verificatie

De lokale tests gebruiken mocks en controleren onder meer kalendergrenzen,
zomer-/wintertijd, 09:00, statussen, stabiele fingerprints, foutisolatie, één
bronlezing per run, uitbreidbaarheid, lockvrijgave en triggermigratie. Echte
Notify-aflevering is geen onderdeel van deze unit-tests. Bewaking van gemiste
uitvoeringen valt buiten deze wijziging.
