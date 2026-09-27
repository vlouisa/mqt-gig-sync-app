# Reisboekingen controleren

Eén gezamenlijke reminder voor ontbrekende reisboekingen van de zanger, via de bestaande tijdgestuurde notificatiecontrole. Geen extra trigger, Sheet-kolommen of wijzigingen aan reis-/gigrecords.

## Selectie

- Alleen `Gig Status = CONFIRMED`, met geldige Sheet-datum en Gig ID.
- `DELETE_REQUESTED` en `DELETED` zijn uitgesloten, zowel voor gigs als reisrecords. Andere SyncStatus-waarden mogen meetellen: een Calendar-fout betekent niet dat een boeking ontbreekt.
- Vanaf veertien kalenderdagen vóór de gig tot en met de dag ervoor, vanaf 09:00 in de scripttijdzone. Dit haalt gemiste controles en laat bevestigde gigs in binnen dat venster.
- Heenvlucht gevonden wanneer Arrival Date op de gigdatum of de dag ervoor ligt.
- Terugvlucht gevonden wanneer Departure Date op de dag na de gig ligt.
- Hotel gevonden wanneer `Check-in Date <= gigdatum < Check-out Date`. Ook een langer verblijf telt mee; uitchecken op de gigdatum dekt de nacht na het optreden niet.

De vergelijking gebruikt uitsluitend datums, niet luchthavens, locaties of personen. De bronsheets bevatten de reizen van de zanger. Er bestaat geen koppeling tussen een reisrecord en Gig ID: andere of opeenvolgende reizen kunnen een reminder onterecht onderdrukken. Lokale gigs kunnen juist een onnodige reminder opleveren; dit is geaccepteerd. Er zijn geen velden voor “niet nodig”. Aankomst op de gigdag wordt niet getoetst aan het aanvangstijdstip.

## Bericht en deduplicatie

Eventcode: **`GIG_TRAVEL_BOOKINGS_MISSING`**.

De melding bevat titel, datum en locatie van de gig, gevolgd door “Geen passende boeking gevonden. Nog te controleren:” en uitsluitend de ontbrekende onderdelen. Als alles aanwezig is volgt geen melding.

Deduplicatie gebruikt de bestaande Notify-library: eventcode, Gig ID, fingerprint en ontvanger. De fingerprint bevat `travel-bookings-reminder` en de lokale gigdatum. Daardoor volgt één gezamenlijke reminder per gigdatum en ontvanger zolang het queue-item bewaard blijft. Boekingen toevoegen/verwijderen of instellingen wijzigen na die reminder levert geen tweede melding voor dezelfde datum op. Verplaatsen naar een nieuwe gigdatum kan wel een nieuwe melding opleveren.

Het queuebericht is een momentopname; een later geboekte reis wijzigt of annuleert dat bericht niet automatisch. Verwijderen van queue-items verwijdert ook die deduplicatiehistorie.

## Configuratie en ingebruikname

Instellingen staan onder `CONFIG.entities.gig.travelBookings`:

| Instelling | Default | Betekenis |
| --- | --- | --- |
| `daysBefore` | `14` | Positief geheel aantal kalenderdagen vóór de gig |
| `notificationTime` | `09:00` | Vroegste controletijd, HH:mm |
| `outboundArrival.from` / `.to` | `-1` / `0` | Inclusief aankomstvenster ten opzichte van gigdatum |
| `returnDeparture.from` / `.to` | `1` / `1` | Inclusief vertrekvenster ten opzichte van gigdatum |

Venstergrenzen moeten gehele getallen tussen -365 en 365 zijn, met from <= to. Hotelcontrole blijft de nacht na het optreden. Kalenderrekenen gebruikt geen aftrek van 24 uur en blijft zo correct rond zomertijd.

1. Publiceer de gewijzigde app-code.
2. Voeg de eventcode met een herkenbare naam en Active toe aan `event-list`.
3. Voeg de gewenste ontvanger toe in `event-subscriptions`, met dezelfde eventcode en Active.
4. Gebruik de bestaande uurtrigger of **Notificaties → Controleer tijdgestuurde notificaties**. Deze menuactie kan echte notificaties klaarzetten.

Er wordt niets automatisch toegevoegd aan eventregistratie of abonnementen. Zonder actieve registratie en abonnement zet Notify geen melding klaar.

## Technische werking en fouten

De nieuwe rule staat in `infrastructure/notification/rules/gig-travel-bookings-missing-rule.js`. De runner ondersteunt nu een optionele `prepare(getSource, context)`-stap per regel. Deze haalt vlucht- en hotelgegevens via de gedeelde broncache op en levert voorbereide waarden als `context.prepared`. Iedere bron wordt eenmaal per uitvoering gelezen. Andere regels hoeven geen prepare-functie te hebben.

Gigs blijven echte Sheet-Date-waarden gebruiken. Reisdatums ondersteunen zowel geldige Sheet-Date-waarden als strikt geldige `yyyy-MM-dd`-strings, omdat de import lokale datumdelen als tekst kan aanleveren. Strings worden niet door UTC-conversie naar een andere kalenderdatum verschoven.

Een ontbrekende reiskolom, leesfout, ongeldige reisdatum of ongeldige hotelperiode blokkeert de hele reisregel voor die uitvoering en wordt technisch gelogd. Dit kan ook door een oud, niet-verwijderd reisrecord worden veroorzaakt. Zo ontstaat geen onterechte conclusie “geen boeking” door onleesbare brondata. Andere notificatieregels blijven werken. Een ongeldige gigdatum of ontbrekend Gig ID wordt per record afgehandeld.

## Verificatie

Lokale tests dekken het gecombineerde lijstje, stabiele/veranderende fingerprints, volledige boekingen, nachtvluchten, meerdaagse hotels, checkout op gigdatum, verwijderde records, het 14-daagse venster, late bevestiging, broncache, foutafhandeling, configureerbare vensters, jaarwisseling en zomertijd. De mocks registreren publicatieverzoeken; daadwerkelijke deduplicatie en aflevering blijven verantwoordelijkheid van Notify.

Geen live Sheets-, Gmail- of notificatieacties uitgevoerd. De externe Notify-bron is tijdens het ontwerp geïnspecteerd; de daadwerkelijk gebruikte externe versie en productieabonnementen zijn niet live geverifieerd.
