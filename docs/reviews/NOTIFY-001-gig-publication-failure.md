# NOTIFY-001 — Gigmelding kan een geslaagde sync laten afbreken

- Ernst: **Hoog**
- Status: **Open**
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
