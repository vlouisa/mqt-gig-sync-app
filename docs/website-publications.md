# Website publications

## Scope en goedgekeurde afwijking van de brief

De [volledige oorspronkelijke brief](website-publications-implementation-brief.md) is ongewijzigd bewaard. Bij goedkeuring is expliciet afgesproken dat **historische en technisch verwijderde gigs uitgesloten zijn**, ook met `CONFIRMED`.

Een gig komt alleen in aanmerking met `Gig Status = CONFIRMED`, een geldige datum van vandaag of later en een `SyncStatus` anders dan `DELETE_REQUESTED` of `DELETED`. Vandaag wordt bepaald in de Apps Script-tijdzone. Bij handmatig aanmaken worden de actuele bron-gig en de snapshotdatum opnieuw gecontroleerd. Een inmiddels ongeschikte gig levert geen WordPress-aanroep op.

De werkvoorraad is een eenmalige snapshot per Gig ID. Synchronisatie wijzigt bestaande regels nooit, ongeacht hun status. Daardoor blijven ook inmiddels historische regels zichtbaar; zij kunnen geen nieuw concept opleveren. Reeds gemaakte WordPress-concepten worden niet automatisch gewijzigd of verwijderd.

Gig ID is een door de applicatie gegenereerde UUID, geen Google Calendar-event-ID. Ontbrekende IDs worden met de bestaande `ensureGigId` ingevuld. De websitefunctie verandert geen Calendar-statussen. Dubbele bron-IDs worden overgeslagen en gelogd.

## Inrichting en gebruik

1. Laat de bestaande WordPress-supportplugin uitbreiden zoals hieronder beschreven.
2. Configureer in Apps Script de Script Properties `WORDPRESS_BASE_URL`, `WORDPRESS_USERNAME` en `WORDPRESS_APPLICATION_PASSWORD`. Gebruik de HTTPS-basis-URL van de WordPress-installatie en een Application Password van een gebruiker die event-concepten mag maken. Zet credentials nooit in Sheets, broncode of logs.
3. Voer als de geconfigureerde MQT-admin de website-inrichtingsactie in het spreadsheetmenu uit. Deze maakt `website-publications` aan met de 17 headers uit de brief. Een bestaand tabblad met afwijkende headers wordt afgewezen; bestaande gegevens worden niet herbouwd.
4. Synchroniseer de werkvoorraad via het menu. Optioneel installeert dezelfde admin de website-trigger vanuit het Triggers-menu. Deze draait ieder uur en maakt uitsluitend snapshots, nooit WordPress-concepten.
5. Bewerk zo nodig Title, Contact Email, Contact Website, Ticket URL en Price. Selecteer precies één dataregel met `READY` en kies de actie om een WordPress-concept aan te maken, of de afzonderlijke overslaanactie.

Andere kolommen en de header zijn beschermd. Sheet-eigenaren en de geconfigureerde admin kunnen deze bescherming omzeilen; behandel bron- en technische kolommen ook voor hen als beheerde velden. Herhaal de inrichtingsactie als de bescherming handmatig is aangepast. Datums worden als `dd-MM-yyyy` en tijden als `HH:mm` weergegeven. Overige kolommen zijn tekstvelden, zodat bijvoorbeeld voorloopnullen in postcodes behouden blijven.

Triggerbeheer betreft uitsluitend de website-handler en de triggers van het uitvoerende account. Gebruik één admin-account voor installatie en beheer. De bestaande Calendar-trigger blijft afzonderlijk beheerd. Website-acties delen het bestaande scriptlock met Calendar-sync. De status-sheet toont de website-trigger afzonderlijk.

## WordPress-contract

De enige create-aanroep is een expliciete menuactie: `POST /wp-json/wp/v2/event`, met `status: draft` en `we_artist: [13]`. Authenticatie is Basic Authentication met de geconfigureerde Application Password. Credentials worden pas bij deze actie gelezen; snapshots werken zonder WordPress-configuratie. Er zijn geen automatische retries, updates of publicatieacties.

Title wordt `title`; Date wordt `_wolf_event_start_date` (`dd-MM-yyyy`). Venue, City, Country, Start, Address en Zip worden respectievelijk `_wolf_event_venue`, `_wolf_event_city`, `_wolf_event_country_short`, `_wolf_event_time`, `_wolf_event_address` en `_wolf_event_zip`. Country wordt niet vertaald; `_wolf_event_country` blijft leeg. Contact Email, Contact Website, Ticket URL en Price worden `_wolf_event_email`, `_wolf_event_website`, `_wolf_event_ticket` en `_wolf_event_price`. `_wolf_event_currency` is altijd `EUR`. Contact Name en Contact Phone worden niet verstuurd. Lege waarden blijven leeg; prijs nul blijft behouden.

De externe plugin **Miracle Gig Sync API Support v0.2.4** staat niet in deze repository. Voeg daar `_wolf_event_email` en `_wolf_event_website` toe aan de bestaande string-meta-registratie voor posttype `event`: `type: string`, `single: true`, `show_in_rest: true`, met dezelfde bestaande autorisatie- en sanitization-conventies. Behoud ondersteuning van custom fields op het posttype. Wijzig geen theme, Wolf-plugin of WordPress-core. Zie de officiële documentatie voor [REST-meta](https://developer.wordpress.org/rest-api/extending-the-rest-api/modifying-responses/) en [register_meta](https://developer.wordpress.org/reference/functions/register_meta/).

Deze externe pluginwijziging en het daadwerkelijk opslaan/uitlezen van beide velden moeten nog in de WordPress-omgeving worden geverifieerd. De lokale tests gebruiken uitsluitend mocks.

## Statussen en herstel

- `READY`: klaar voor handmatige verwerking.
- `DRAFT_CREATED`: HTTP 201 met een geldig event-ID, type event en status draft; ID en beheerlink zijn opgeslagen.
- `SKIPPED`: bewust overgeslagen via het menu.
- `ERROR`: validatiefout, mislukte poging of onzekere uitkomst; geen automatische herverwerking.

Vóór de HTTP-aanroep schrijft de applicatie `ERROR` met een melding dat de poging gestart is, voert een flush uit en controleert de blokkering. Na een succesvolle create wordt eerst het echte WordPress-ID opgeslagen. Een gevuld WP Event ID blokkeert altijd een tweede create, ook als iemand de status naar READY wijzigt. Een onverwachte response met een geldig ID bewaart dat ID en blijft ERROR.

Bij fouten controleert een beheerder Last Error en WordPress handmatig. Een timeout of afgebroken uitvoering kan betekenen dat er wél een concept bestaat. Maak dan geen nieuw concept: zoek het bestaande event, vul het echte ID en de beheerlink in en zet uitsluitend een bevestigd event-concept op DRAFT_CREATED. Bij een terugschrijffout vermeldt de melding/log het ontvangen event-ID. Ook een andere WordPress-status mag niet tot een nieuwe create leiden.

Alleen nadat vaststaat dat geen event is aangemaakt, mag de beheerder de oorzaak oplossen, Last Error wissen en de status terugzetten naar READY. Bij lokale validatie-/configuratiefouten vóór de POST is geen create uitgevoerd. Verwijder nooit een bestaand WP Event ID om opnieuw te proberen. Voer herstel uit wanneer geen synchronisatie of handmatige create loopt; het scriptlock beschermt niet tegen handmatige Sheet-bewerkingen.

## Lokale verificatie

`npm.cmd run test:unit` omvat de snapshotselectie, identiteit, behoud van snapshots, Sheet-schema, payload, foutafhandeling, blokkering van dubbele creates, triggerbeheer, menu en statusweergave. Er worden geen live Google- of WordPress-services aangeroepen.
