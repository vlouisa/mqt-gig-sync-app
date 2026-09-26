# NOTIFY-001 — Gigmelding kan een geslaagde sync laten afbreken

- Ernst: **Hoog**
- Status: **Opgelost in code — lokale testuitvoering nog niet geverifieerd**
- Zekerheid: **Bewezen uit control flow**, niet uitgevoerd in Apps Script.
- Locatie: `domain/gig/gig-sync-service.js:127-135`, `processRow_`,
  `publishRowToCalendar_` en `handlePublicationError_` (regels 223-228).
- Afhankelijkheden: `common/config.js`, `common/sync-status-service.js:setStatus`.

## Probleem en gevolg

Een gig wordt eerst in Calendar gepubliceerd en op `SYNCED` gezet. Vervolgens
wordt `publishGigPublished` aangeroepen binnen dezelfde try/catch. Als de
notificatiepublicatie faalt, bijvoorbeeld doordat een notificatietabblad ontbreekt
of een queue-write faalt, behandelt de catch dit als Calendar-publicatiefout.

De foutafhandeling schrijft LastError en probeert `SYNCED -> ERROR`. Deze
overgang is niet toegestaan en `setStatus` gooit daarom opnieuw een fout. Die
verlaat de rijlus en vervolgens `syncEventsToCalendar`: volgende gigs en de nog
niet uitgevoerde domeinen worden overgeslagen. De gig blijft `SYNCED`; de melding
wordt niet vanzelf opnieuw aangeboden. Ook de succes-audit ontbreekt.

## Gerichte oplossing

Handel notificatiepublicatie afzonderlijk af nadat de Calendar-publicatie is
vastgelegd. Behoud de juiste Calendar-status en succes-audit. Log een
notificatiefout afzonderlijk en bepaal expliciet hoe een mislukte enqueue later
kan worden hervat zonder de Calendar-publicatie te herhalen. Maak geen nieuwe
statusovergang alleen om deze catch te laten slagen.

## Verificatie

De echte statusservice valideert de overgang; de syncmock in
`scripts/domain-test-support.cjs` accepteert iedere status en de notificatiemock
gooit geen fouten. De huidige happy-path- en Calendar-fouttests bewijzen dit
scenario dus niet. Voeg een geïsoleerde regressietest toe waarin een succesvolle
Calendar-write wordt gevolgd door een falende notificatiepublicatie; controleer
de blijvende SYNCED-status, audit en verwerking van een volgende rij.

## Verwerking

De aanroep van `publishGigPublished` heeft nu een eigen try/catch. Een fout wordt
technisch gelogd als `gig-published-notification-error`, met rijnummer en Gig ID.
De Calendar-status en LastError blijven behouden en de succes-audit wordt alsnog
geschreven. Volgende records worden verwerkt.

Er is bewust geen automatische retry toegevoegd. Een enqueue kan voor een deel
van de ontvangers al geslaagd zijn. Bestaande queue-items blijven door Notify
verwerkt worden; een niet klaargezette melding vereist handmatig herstel via de
bestaande notificatiepublicatie met hetzelfde Gig ID en dezelfde fingerprint.
Zet hiervoor de Calendar-status niet terug: opnieuw synchroniseren is onnodig.

`testGigSyncNotificationFailureIsolation` simuleert een falende gigmelding en
controleert de status, Calendar-ID, LastError, succes-audits, technische logging,
verwerking van de volgende gig en het uitblijven van herpublicatie bij een
volgende sync. De test is geregistreerd in de gig-sync-suite.

`npm run test:unit` kon ook bij deze wijziging niet starten omdat npm/node niet
beschikbaar zijn op PATH. De nieuwe test is dus nog niet uitgevoerd.

Een onafhankelijke modelreview heeft de foutisolatie en regressieassertions
gecontroleerd en geen blokkade voor deze fix gevonden. Het genoemde aandachtspunt
over herstel van een mislukte enqueue is hierboven expliciet vastgelegd als
handmatige herpublicatie; automatische retries vallen buiten deze oplossing.
