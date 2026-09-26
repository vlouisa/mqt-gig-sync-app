# NOTIFY-003 — PROCESSING-items blijven na onderbreking vaststaan

- Ernst: **Hoog**
- Status: **Open — oplossing in externe Notify-library**
- Zekerheid: **Bewezen selectiegedrag in lokale librarybron**; het optreden
  van een onderbroken productie-uitvoering is niet vastgesteld.
- Locaties: `../mqt-sync-notification-library/notification-worker.js:41`,
  `processQueueItem`; `../mqt-sync-notification-library/event-queue-service.js:93-108`,
  `getPending`, en `markProcessing`.

## Probleem en gevolg

De worker schrijft PROCESSING voordat hij de provider aanroept. Volgende runs
selecteren uitsluitend PENDING. Er is geen herstelpad voor verouderde
PROCESSING-items; Processing At wordt wel geschreven, maar niet gebruikt voor
herstel.

Als een uitvoering wordt beëindigd tussen markProcessing en markSent, of als
een providerfout wordt gevolgd door een mislukte statuswrite bij foutafhandeling,
blijft het item op PROCESSING. Het wordt nooit opnieuw geselecteerd. Opnieuw
publiceren helpt niet: `exists` vindt de bestaande queue-ID ongeacht de status.
Een melding die nog niet was verzonden, wordt daardoor blijvend overgeslagen.

## Gerichte oplossing

Voeg in de Notify-library onder het workerlock detectie en afhandeling van
verouderde PROCESSING-items toe. Bepaal een passende ouderdomsgrens en leg de
onzekere afleverstatus vast. Blind opnieuw verzenden kan dubbele meldingen
geven als de provider al had afgeleverd maar markSent nog niet was geschreven.
Maak daarom een expliciete keuze tussen gecontroleerde herhaling en handmatig
herstel; dupliceer deze queuelogica niet in Gig Sync.

## Verificatie

De volledige lokale worker en queueservice zijn gelezen; getPending sluit alle
PROCESSING-rijen uit en er is geen herstelroute in deze code. Controleer met
in-memory tests een oud PROCESSING-item, een recente actieve verwerking en de
situatie waarin aflevering al gelukt was. Echte aflevering en de gepubliceerde
libraryversie zijn niet gecontroleerd.
