# NOTIFY-002 — Foutnotificaties doorbreken isolatie per record

- Ernst: **Hoog**
- Status: **Open**
- Zekerheid: **Bewezen uit control flow en lokaal Notify-contract**.
- Locaties: `domain/gig/gig-sync-service.js:230`,
  `domain/flight/flight-sync-service.js:211`,
  `domain/hotel/hotel-sync-service.js:211`, functie `handlePublicationError_`.
- Contract: `../mqt-sync-notification-library/notification-publisher.js:15-18`.

## Probleem en omstandigheden

Na een recordfout wordt de status ERROR vastgelegd en wordt zonder eigen catch
een foutnotificatie gepubliceerd. Elke fout bij Notify-initialisatie, het lezen
van notificatieconfiguratie of enqueue verlaat daardoor de foutafhandeling zelf.
De resterende records en eventuele volgende domeinen worden niet verwerkt.
De auditregel na de notificatieaanroep wordt evenmin geschreven.

Dit kan ook zonder een storing in Notify gebeuren:

- Een vlucht of hotel zonder ID faalt terecht bij validatie. De foutmelding
  gebruikt vervolgens dat ontbrekende ID als `sourceId`. Notify weigert dit
  voordat eventactivatie of abonnementen worden gecontroleerd.
- Bij een gig zonder ID schrijft `ensureTechnicalFields_` een nieuwe UUID in
  Sheets. Publicatie gebruikt de opnieuw ingelezen rij, maar foutafhandeling
  ontvangt de oorspronkelijke rij. Bij een daaropvolgende validatie- of
  Calendar-fout is het `sourceId` daarin nog leeg. De echte sheetservice werkt
  dit oorspronkelijke JavaScript-object niet bij.

## Gerichte oplossing

Vang fouten van foutnotificaties afzonderlijk af, log die technisch en laat de
oorspronkelijke fout-audit en volgende records doorgaan. Gebruik voor gigs het
reeds toegewezen bron-ID. Als een record geen stabiele identiteit heeft, leg de
fout lokaal vast en sla de ongeldige notificatieaanroep gecontroleerd over;
introduceer geen willekeurige bron-ID die deduplicatie onbetrouwbaar maakt.

## Verificatie

Inspectie van de drie callers en de echte Notify-publisher bevestigt het pad.
De lokale syncmocks laten notificaties altijd slagen en muteren rijobjecten bij
Sheet-writes; daardoor missen ze zowel het Notify-contract als de verouderde
gigrij. Benodigde regressies: falende foutpublicatie met een volgende geldige
rij, ontbrekende vlucht-/hotel-ID en nieuw toegewezen gig-ID gevolgd door een
validatiefout. Tests zijn tijdens deze review niet uitgevoerd.
