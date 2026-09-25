# Notificatie voor vervallende gigopties

Eventcode: `GIG_OPTION_EXPIRES_TODAY`.

De controle selecteert `Gig Status = OPTION` met een echte Sheet-datum in
`Option Expiry Date` die vandaag is in de scripttijdzone (`Europe/Brussels`).
`SyncStatus` staat hiervan los: alleen `DELETE_REQUESTED` en `DELETED` worden
uitgesloten. Ook `DRAFT` telt mee, mits een Gig ID aanwezig is.

In `CONFIG.entities.gig.optionExpiry` staan:

- `notificationTime`: standaard `09:00`, formaat `HH:mm`.

De generieke notificatiecontrole draait elk uur via
`CONFIG.notifications.schedule.everyHours`. Zie [tijdgestuurde notificaties](scheduled-notifications.md).

Een wijziging van het meldtijdstip werkt bij de volgende controle. Na wijziging
van het interval moet de trigger opnieuw worden geïnstalleerd. De controle haalt
gemiste uitvoeringen alleen dezelfde dag in. Aflevering volgt via de bestaande
notificatie-worker; het ingestelde tijdstip is geen exacte aflevergarantie.

## Ingebruikname na codepublicatie

1. Voeg in `gig-input` kolom J in, direct na `SyncStatus` (I) en vóór `Gig ID`
   (voorheen J, daarna K). Header: exact `Option Expiry Date`.
2. Stel datumvalidatie en datumweergave in. Lege waarden zijn toegestaan;
   tekstwaarden worden niet als datum geïnterpreteerd. Bestaande opties mogen
   voorlopig een lege datum houden.
3. Ververs direct na de schemawijziging de kolomindexcache met
   `sheetService.clearColumnIndexMapCache(CONFIG.entities.gig.sheetName)`.
   Voer de schemawijziging uit terwijl verwerking en handmatige edits stilliggen,
   zodat oude gecachete kolomposities geen verkeerde cellen raken.
4. Gebruik het menu `Systeem > Bescherm technische kolommen` en controleer de
   verschoven beschermingen. De nieuwe vervaldatumkolom moet bewerkbaar zijn.
5. Vul zelf `event-list` en `event-subscriptions` in met bovenstaande eventcode.
   De bestaande notificatie-worker en ontvangerconfiguratie blijven nodig.
6. Gebruik `Triggers > Installeer notificatiecontrole`. Dit vervangt ook de oude
   optietrigger. Controleer in `system-status` dat `Scheduled Notifications` en
   `Notification Worker` op `OK` staan.
7. Verifieer met een afgesproken testoptie de queue en aflevering. Deze controle
   wijzigt echte gegevens en verstuurt mogelijk een notificatie.

De implementatie voert deze live stappen niet automatisch uit.

## Gedrag bij wijzigingen en fouten

Alleen de vervaldatum wijzigen activeert geen Calendar-sync. De optiecontrole
wijzigt zelf geen gigvelden, Calendar-events of syncstatussen. Ontbrekende IDs,
ongeldige datums en publicatiefouten worden per gig technisch gelogd.

Notify dedupliceert op eventcode, Gig ID, fingerprint van de lokale vervaldatum
en ontvanger. Bewaar de relevante queue-items om deze historie te behouden.
Een nieuwe vervaldatum maakt een nieuwe melding mogelijk; titelwijzigingen niet.
Een reeds klaargezette melding wordt niet ingetrokken bij verlenging of bevestiging.
De bestaande afleverretrylogica garandeert geen exact eenmalige aflevering.

## Verificatie

De lokale unit-suite bevat tests voor datum- en tijdgrenzen, zomer-/wintertijd,
statusselectie, lege/ongeldige waarden, verlenging, stabiele fingerprints,
berichtinhoud, foutisolatie, lockvrijgave en triggerbeheer. Notify wordt gemockt;
daadwerkelijke deduplicatie en aflevering blijven het contract van die library.
