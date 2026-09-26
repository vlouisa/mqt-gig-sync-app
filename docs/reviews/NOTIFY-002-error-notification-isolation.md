# NOTIFY-002 — Foutnotificaties doorbreken isolatie per record

- Ernst: **Hoog**
- Status: **Opgelost; lokale unit-tests geslaagd**
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
validatiefout. Tests zijn tijdens de oorspronkelijke review niet uitgevoerd.

## Oplossing en verificatie

De gig-, flight- en hotel-syncservices gebruiken
`syncFailedNotificationService.tryPublish`. Deze gedeelde methode controleert
het bron-ID en vangt fouten uit `publish` af. Het bestaande `publish`-contract
blijft behouden: directe callers ontvangen nog steeds exceptions.
De oorspronkelijke `LastError`, status ERROR en fout-audit blijven behouden;
volgende records worden verwerkt. Zonder bron-ID wordt de notificatie overgeslagen
met een technische waarschuwing. Na een geslaagde ID-write bewaart de gigservice
de nieuwe UUID ook in het oorspronkelijke rijobject voor de foutafhandeling.
Er zijn geen retries, nieuwe IDs voor foutmeldingen of librarywijzigingen toegevoegd.

Zeven nieuwe regressiegevallen controleren falende foutmeldingen bij publicatie
en verwijdering voor alle drie domeinen, ontbrekende IDs en een nieuw gig-ID
gevolgd door een validatiefout. Die laatste test gebruikt afzonderlijke
Sheet-snapshots zodat writes het ingelezen object niet impliciet bijwerken.

De technische notificatielogs staan nu onder module
`sync-failed-notification-service`, met codes `sync-failed-notification-error`
en `sync-failed-notification-skipped`. Eventcode, entity, bron-ID en rijnummer
staan in de logcontext; deze vervangen de domeinspecifieke notificatielogcodes.

Drie extra tests controleren succesvolle `tryPublish`, ontbrekende identiteit
en fouten bij initialisatie, fingerprint, datumformattering en publicatie.
De sync-tests laden de echte lokale notificatieservice met Notify-mocks.

`npm.cmd run test:unit`: **158 geslaagd, 0 mislukt**. De tests gebruiken lokale
mocks; er zijn geen integratietests met echte Sheets, Calendar of Notify uitgevoerd.
Het contract van de lokale Notify-publisher is geïnspecteerd; de gepubliceerde
libraryversie is niet gecontroleerd. De wijziging is niet gedeployd.
