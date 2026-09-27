# Implementation Brief — Website Publications → WordPress Draft

## 1. Doel

Breid Miracle Gig Sync uit met een aparte workflow voor websitepublicaties.

Een `CONFIRMED` gig uit `gig-input` moet automatisch als publicatie-item terechtkomen in het tabblad:

`website-publications`

Vanuit `website-publications` moet een gebruiker vervolgens expliciet een WordPress Event Draft kunnen aanmaken via de standaard WordPress REST API.

De bestaande Calendar Sync staat volledig buiten scope en moet ongewijzigd blijven werken.

De gewenste hoofdlijn is:

```text
                    ┌──> bestaande Calendar Sync
gig-input ──────────┤
                    │
                    └──> website-publications
                              │
                              │ expliciete gebruikersactie
                              ▼
                        WordPress Draft
                              │
                              │ handmatig
                              ▼
                           Publish
```

Belangrijk onderscheid:

- `gig-input` is de bronadministratie.
- `website-publications` is een publicatiewerkvoorraad/snapshot.
- WordPress ontvangt uitsluitend drafts.
- Publiceren gebeurt handmatig in WordPress.

---

# 2. Eerst doen

Inspecteer vóór implementatie:

- `AGENTS.md`;
- relevante `SKILL.md` bestanden;
- bestaande projectstructuur;
- bestaande spreadsheet-/sheet abstractions;
- bestaande menu-opbouw;
- bestaande configuratie-/secrets-aanpak;
- bestaande trigger-inrichting;
- verwerking van `gig-input`;
- bestaande tests.

Sluit aan op bestaande conventies en architectuur.

Kies de kleinste gerichte wijziging die onderstaande functionaliteit realiseert.

Behoud bestaand gedrag tenzij deze opdracht expliciet iets anders vraagt.

Wijzig de bestaande Calendar Sync niet om deze functionaliteit te realiseren.

Maak vóór implementatie eerst een kort implementatieplan op basis van de daadwerkelijk aangetroffen repository.

---

# 3. Bronadministratie

`gig-input` blijft de bronadministratie voor gigs.

Aan `gig-input` zijn reeds deze negen nieuwe bronvelden toegevoegd:

- Venue
- Address
- Zip
- City
- Country
- Contact Name
- Contact Phone
- Contact Email
- Contact Website

Deze wijziging is al geïmplementeerd.

## Country

`Country` bevat in de bronadministratie rechtstreeks een landcode, bijvoorbeeld:

- `NL`
- `BE`
- `DE`

Voor v1:

- geen validatie toevoegen;
- geen dropdown toevoegen;
- geen conversie van landnaam naar landcode;
- verantwoordelijkheid voor correcte invoer ligt bij de gebruiker.

---

# 4. Nieuw tabblad

Het nieuwe tabblad heet exact:

`website-publications`

Gebruik exact onderstaande kolommen en volgorde:

1. Status
2. Title
3. Date
4. Venue
5. City
6. Country
7. Start
8. Address
9. Zip
10. Contact Email
11. Contact Website
12. Ticket URL
13. Price
14. WP Event ID
15. WP Draft URL
16. Gig ID
17. Last Error

`Gig ID` is de technische identity van de gig.

Gebruik uitsluitend `Gig ID` om een publication-record aan de bron-gig te koppelen en om duplicaten te voorkomen.

Gebruik nooit Date, Title, Venue of een combinatie daarvan als technische identity.

---

# 5. Editable versus niet-editable

De kolommen hebben vanuit gebruikersperspectief de volgende betekenis:

| Kolom | Editable? | Functie |
|---|:---:|---|
| Status | beperkt | Publicatieworkflow |
| Title | ja | Titel voor WordPress |
| Date | nee | Datum van het event |
| Venue | nee | Venue |
| City | nee | Plaats |
| Country | nee | Landcode |
| Start | nee | Aanvangstijd |
| Address | nee | Adres |
| Zip | nee | Postcode |
| Contact Email | ja | Publieke contactmail |
| Contact Website | ja | Publieke website |
| Ticket URL | ja | Ticketlink |
| Price | ja | Ticketprijs |
| WP Event ID | nee | Technische WordPress-koppeling |
| WP Draft URL | nee | Link naar WordPress draft/editor |
| Gig ID | nee | Technische koppeling naar `gig-input` en deduplicatie |
| Last Error | nee | Technische foutinformatie |

De volgende velden zijn dus bedoeld als door de gebruiker aanpasbare publicatiegegevens:

- Title
- Contact Email
- Contact Website
- Ticket URL
- Price

De volgende velden komen uit de bronadministratie en zijn binnen deze workflow niet bedoeld als alternatieve bronadministratie:

- Date
- Venue
- City
- Country
- Start
- Address
- Zip

Technische/integratievelden:

- Status
- WP Event ID
- WP Draft URL
- Gig ID
- Last Error

Status wordt primair door de workflow beheerd, met uitzondering van een eventuele expliciete gebruikersactie om een publicatie over te slaan.

---

# 6. Publication statuses

Ondersteun in v1:

- `READY`
- `DRAFT_CREATED`
- `SKIPPED`
- `ERROR`

## READY

De gig staat klaar voor controle/aanvulling en kan als WordPress draft worden aangemaakt.

## DRAFT_CREATED

Een WordPress Event Draft is succesvol aangemaakt en het WordPress Event ID is bekend.

## SKIPPED

Deze gig hoeft bewust niet via deze workflow naar de website.

## ERROR

Een poging richting WordPress is mislukt.

Sla bij `ERROR` een bruikbare foutomschrijving op in `Last Error`.

Voeg in v1 geen `PUBLISHED` status toe.

Publiceren gebeurt handmatig in WordPress en Miracle Gig Sync weet in v1 niet betrouwbaar of een draft later gepubliceerd is.

---

# 7. Automatisch vullen van website-publications

Maak een idempotente functie die `gig-input` scant en ontbrekende website-publicaties aanmaakt.

Conceptueel bijvoorbeeld:

```text
syncWebsitePublications()
```

De uiteindelijke naam moet aansluiten bij bestaande projectconventies.

Per gig:

1. Controleer of Gig Status `CONFIRMED` is.
2. Zo niet: niets doen.
3. Controleer op basis van `Gig ID` of al een record bestaat in `website-publications`.
4. Bestaat het Gig ID al: niets doen.
5. Bestaat het Gig ID nog niet: voeg exact één nieuwe regel toe met Status `READY`.

Een gig mag nooit meerdere regels in `website-publications` krijgen doordat de sync meerdere keren wordt uitgevoerd.

De functie moet dus idempotent zijn.

`Gig ID` is hiervoor de enige identity.

---

# 8. Snapshotgedrag

Bij het aanmaken van een nieuwe `READY` regel worden relevante gegevens uit `gig-input` als snapshot overgenomen.

Neem minimaal over:

- Title
- Date
- Venue
- City
- Country
- Start
- Address
- Zip
- Contact Email
- Contact Website
- Gig ID

`Ticket URL` en `Price` mogen initieel leeg zijn als deze niet uit bestaande brondata beschikbaar zijn.

Na het aanmaken van een publication-record mag een volgende automatische sync bestaande records NIET opnieuw vanuit `gig-input` overschrijven.

Reden:

`website-publications` is vanaf dat moment de publicatiewerkvoorraad en bepaalde waarden kunnen daar bewust door de gebruiker zijn aangepast.

Dus:

```text
nieuwe Gig ID
→ snapshot aanmaken

bestaande Gig ID
→ publication-record volledig ongemoeid laten
```

Hierdoor blijven bijvoorbeeld een handmatig aangepaste Title, Contact Website, Ticket URL of Price behouden.

---

# 9. Automatische trigger

De synchronisatie van `gig-input` naar `website-publications` moet automatisch ieder uur kunnen draaien via een Google Apps Script time-driven trigger.

Gebruik hiervoor dezelfde syncfunctie als voor handmatige uitvoering.

Bouw geen aparte implementatie voor trigger versus handmatige sync.

Voorzie daarnaast een handmatige actie via het bestaande applicatiemenu, zodat de gebruiker niet maximaal een uur hoeft te wachten nadat een gig `CONFIRMED` is gemaakt.

Bijvoorbeeld conceptueel:

```text
Website
└── Sync publications
```

De exacte menu-opbouw en benaming moet aansluiten bij de bestaande applicatie.

Als het project al een conventie/mechanisme heeft voor het installeren/beheren van triggers, sluit daarop aan.

Voorkom het onbedoeld installeren van meerdere identieke hourly triggers.

---

# 10. Harde automatiseringsgrens

De hourly trigger mag NOOIT automatisch WordPress aanroepen.

Automatisch is uitsluitend:

```text
CONFIRMED gig
      ↓
website-publications
      ↓
READY
```

WordPress wordt alleen aangeroepen na een expliciete gebruikersactie.

Dit is een harde requirement.

Een trigger mag dus nooit:

- een WordPress Event aanmaken;
- een WordPress Event wijzigen;
- een WordPress Event publiceren;
- een retry richting WordPress uitvoeren.

---

# 11. WordPress Draft handmatig aanmaken

Vanuit `website-publications` moet een gebruiker expliciet een geselecteerde `READY` regel als WordPress Event Draft kunnen aanmaken.

Voeg hiervoor een passende actie toe aan het bestaande applicatiemenu.

Conceptueel bijvoorbeeld:

```text
Website
└── Create WordPress draft
```

Gebruik de actieve/geselecteerde rij in `website-publications`.

Voer vóór de REST-call minimaal deze controles uit:

- actie wordt uitgevoerd vanuit `website-publications`;
- er is een geldige dataregel geselecteerd;
- Status is `READY`;
- Gig ID is aanwezig;
- WP Event ID is leeg.

Maak nooit een nieuw WordPress-event wanneer al een `WP Event ID` aanwezig is.

---

# 12. WordPress REST API

Gebruik de standaard WordPress REST API.

Endpoint:

```text
/wp-json/wp/v2/event
```

Gebruik een HTTP POST met JSON.

Authenticatie gebeurt met een WordPress Application Password via HTTP Basic Authentication over HTTPS.

De authenticatie is tijdens de POC reeds handmatig bewezen via:

```text
GET /wp-json/wp/v2/users/me
```

Resultaat:

```text
HTTP 200
```

Er is dus geen aanvullende custom authentication-route nodig.

---

# 13. WordPress configuratie en secrets

Hardcode geen WordPress-verbindingsconfiguratie in de sourcecode.

Minimaal onderstaande waarden zijn configuratie:

- WordPress base URL
- WordPress username
- WordPress Application Password

De WordPress username mag dus ook NIET hardcoded worden.

Het Application Password is een secret.

De username is op zichzelf geen secret, maar moet eveneens configureerbaar zijn zodat de integratie niet aan één WordPress-account gekoppeld is.

Inspecteer eerst de bestaande configuratie-/secrets-aanpak van het project.

Als er nog geen geschikte aanpak bestaat, gebruik een passende Google Apps Script-oplossing, bij voorkeur Script Properties.

Log nooit:

- Application Password;
- volledige Authorization header;
- Base64 Basic Auth credentials.

Voorkom tevens dat secrets terechtkomen in foutmeldingen of debuglogging.

---

# 14. WordPress Event payload

Een event dat via Miracle Gig Sync wordt aangemaakt moet ALTIJD:

```text
status = draft
```

hebben.

Publiceren vanuit Apps Script is in v1 niet toegestaan.

Koppel altijd de bestaande Miracle artist taxonomy-term:

```text
we_artist = [13]
```

Term ID `13` is reeds geverifieerd als:

```text
Miracle the Dutch Queen tributeband
```

---

# 15. Mapping website-publications → WordPress

Gebruik onderstaande mapping:

| website-publications | WordPress |
|---|---|
| Title | `title` |
| Date | `_wolf_event_start_date` |
| Venue | `_wolf_event_venue` |
| City | `_wolf_event_city` |
| Country | `_wolf_event_country_short` |
| Start | `_wolf_event_time` |
| Address | `_wolf_event_address` |
| Zip | `_wolf_event_zip` |
| Contact Email | `_wolf_event_email` |
| Contact Website | `_wolf_event_website` |
| Ticket URL | `_wolf_event_ticket` |
| Price | `_wolf_event_price` |

Daarnaast altijd:

```text
_wolf_event_currency = EUR
we_artist = [13]
status = draft
```

`Country` bevat reeds de landcode en wordt 1-op-1 naar:

```text
_wolf_event_country_short
```

gestuurd.

Voer in v1 geen country-conversie of country-validatie uit.

Laat:

```text
_wolf_event_country
```

leeg.

Respecteer het datumformaat dat Wolf Events verwacht:

```text
dd-mm-yyyy
```

---

# 16. Contactgegevens

`gig-input` bevat:

- Contact Name
- Contact Phone
- Contact Email
- Contact Website

Alleen onderstaande contactvelden gaan naar de website-publicatieworkflow:

- Contact Email
- Contact Website

Deze zijn in `website-publications` editable.

Contact Name en Contact Phone blijven uitsluitend in de bronadministratie en worden in v1 niet gepubliceerd.

---

# 17. WordPress bridge-plugin

Op WordPress is reeds een kleine custom plugin actief:

```text
Miracle Gig Sync API Support
```

Huidige versie:

```text
0.2.4
```

De plugin:

- zet REST support aan voor CPT `event`;
- voegt `custom-fields` support toe aan CPT `event`;
- zet REST support aan voor taxonomy `we_artist`;
- registreert de benodigde Wolf Events post meta voor REST.

De volgende Wolf-meta zijn reeds REST-enabled:

- `_wolf_event_start_date`
- `_wolf_event_end_date`
- `_wolf_event_venue`
- `_wolf_event_location`
- `_wolf_event_city`
- `_wolf_event_country`
- `_wolf_event_country_short`
- `_wolf_event_state`
- `_wolf_event_time`
- `_wolf_event_address`
- `_wolf_event_zip`
- `_wolf_event_ticket`
- `_wolf_event_price`
- `_wolf_event_currency`

Voor deze feature moeten daarnaast REST-enabled worden:

- `_wolf_event_email`
- `_wolf_event_website`

Wijzig hiervoor uitsluitend de custom:

```text
Miracle Gig Sync API Support
```

plugin.

Wijzig NIET:

- Wolf Events plugin;
- Decibel theme;
- theme `functions.php`;
- WordPress core.

De custom plugin is bewust de isolatielaag tussen Wolf Events en Miracle Gig Sync.

Als de WordPress-plugin niet in dezelfde repository wordt beheerd, implementeer daar dan niet blind een fictieve wijziging voor. Documenteer in dat geval exact welke twee meta-fields aan de bestaande plugin moeten worden toegevoegd.

---

# 18. Reeds bewezen WordPress POC

De technische integratie is al handmatig bewezen.

Een Google Apps Script POST naar:

```text
/wp-json/wp/v2/event
```

leverde:

```text
HTTP 201 Created
```

WordPress Event ID:

```text
2049
```

De testpayload bevatte onder andere:

- `status = draft`
- `we_artist = [13]`
- start date
- venue
- location
- city
- country short
- currency

WordPress retourneerde de waarden correct via REST.

Daarna is event `2049` handmatig geopend in de WordPress/Wolf Events admin-interface.

Daar werden onder andere correct weergegeven:

- Date
- Venue
- Location
- City
- Country-short
- Currency
- Miracle artist

Daarmee is bewezen dat Wolf Events de via REST geschreven metadata als normale Wolf Event-data interpreteert.

Er hoeft dus geen custom REST-controller gebouwd te worden.

Gebruik de standaard WordPress REST API.

---

# 19. Afhandeling succesvolle create

Bij HTTP:

```text
201 Created
```

moet de applicatie:

1. het WordPress Event ID uit de response lezen;
2. dit opslaan in `WP Event ID`;
3. een bruikbare WordPress editor/draft-link maken en opslaan in `WP Draft URL`;
4. Status op `DRAFT_CREATED` zetten;
5. `Last Error` leegmaken.

De gebruiker opent daarna WordPress via `WP Draft URL`, controleert/verrijkt het event en publiceert het handmatig.

Miracle Gig Sync publiceert het event niet.

---

# 20. Foutafhandeling

Bij een duidelijke mislukte WordPress-call:

- zet Status op `ERROR`;
- schrijf een bruikbare foutomschrijving naar `Last Error`;
- vul geen fictief WP Event ID in;
- zet Status nooit op `DRAFT_CREATED` zonder bevestigde succesvolle create.

Log technische details volgens bestaande projectconventies.

Log nooit credentials of Authorization-data.

Maak gebruikersfouten en technische fouten waar praktisch mogelijk begrijpelijk zonder gevoelige informatie bloot te geven.

---

# 21. Retry / duplicate safety

Behandel retries voorzichtig.

Een timeout of netwerkfout kan theoretisch optreden nadat WordPress het event al heeft aangemaakt, maar voordat Apps Script de HTTP-response heeft ontvangen.

Implementeer daarom geen naïeve automatische retry die zonder verdere controle opnieuw een POST uitvoert.

Een bestaande `WP Event ID` blokkeert altijd een nieuwe create.

Onderzoek binnen de bestaande architectuur een eenvoudige, veilige v1-aanpak voor een ambigue create-fout.

Prioriteit:

```text
voorkom dubbele WordPress-events
```

boven:

```text
automatisch opnieuw proberen
```

Een handmatige herstelactie is acceptabel als die veiliger is dan automatische retry.

Documenteer de gekozen aanpak.

---

# 22. Geen bidirectionele synchronisatie in v1

`website-publications` is in v1 een snapshot/publicatiewerkvoorraad.

Bouw NIET:

- automatische updates van bestaande publication-records vanuit `gig-input`;
- automatische updates van bestaande WordPress drafts wanneer brondata verandert;
- synchronisatie WordPress → Google Sheets;
- detectie of een draft later handmatig gepubliceerd is;
- automatische verwijdering van WordPress-events;
- automatische publicatie naar WordPress.

Deze zaken zijn expliciet buiten scope voor v1.

---

# 23. Calendar Sync buiten scope

De bestaande Calendar Sync moet blijven functioneren zoals nu.

De nieuwe website-publicatieworkflow mag Calendar Sync niet nodig hebben om te functioneren.

Architectuur:

```text
                    ┌──> bestaande Calendar Sync
                    │
gig-input ──────────┤
                    │
                    └──> website-publications
                              │
                              │ expliciete gebruikersactie
                              ▼
                        WordPress Draft
                              │
                              │ handmatig
                              ▼
                           Publish
```

Calendar Sync en Website Publications zijn twee afzonderlijke consumers/workflows van dezelfde bronadministratie.

Wijzig Calendar Sync niet om Website Publications te implementeren.

---

# 24. Gewenste gebruikersflow

De normale gebruikersflow is:

1. Gebruiker beheert een gig in `gig-input`.
2. Gig krijgt status `CONFIRMED`.
3. Binnen maximaal ongeveer één uur detecteert de hourly trigger de gig.
4. Er verschijnt automatisch exact één `READY` regel in `website-publications`.
5. Gebruiker kan eventueel handmatig `Sync publications` uitvoeren om niet op de trigger te hoeven wachten.
6. Gebruiker controleert de publication-regel.
7. Gebruiker past indien nodig aan:
   - Title
   - Contact Email
   - Contact Website
   - Ticket URL
   - Price
8. Gebruiker selecteert de gewenste regel.
9. Gebruiker kiest expliciet `Create WordPress draft`.
10. Miracle Gig Sync maakt één WordPress Event Draft aan.
11. Apps Script ontvangt HTTP `201`.
12. Apps Script slaat WP Event ID en WP Draft URL op.
13. Status wordt `DRAFT_CREATED`.
14. Gebruiker opent WordPress.
15. Gebruiker controleert/verrijkt het event daar eventueel verder.
16. Gebruiker publiceert handmatig.

---

# 25. Belangrijkste invarianten

Deze invarianten moeten in ontwerp, implementatie en tests zichtbaar zijn.

## Identity

`Gig ID` is de enige identity voor koppeling/deduplicatie tussen:

```text
gig-input
```

en:

```text
website-publications
```

## Eén publication-record

Eén Gig ID mag maximaal één publication-record opleveren.

## Triggergrens

De hourly trigger doet nooit een WordPress-call.

## Expliciete create

Alleen een expliciete gebruikersactie mag een WordPress-event creëren.

## Draft-only

Miracle Gig Sync creëert uitsluitend WordPress drafts.

## Duplicate protection

Een bestaande `WP Event ID` blokkeert een tweede create.

## Snapshot

Bestaande publication-records worden niet automatisch overschreven vanuit `gig-input`.

## Credentials

WordPress base URL, username en Application Password worden niet hardcoded in sourcecode.

## Calendar

Calendar Sync blijft functioneel en architectonisch buiten deze feature.

## WordPress-isolatie

Wolf Events, Decibel, theme `functions.php` en WordPress core worden niet aangepast.

---

# 26. Tests

Voeg passende tests toe volgens de bestaande teststrategie.

Test minimaal:

- alleen `CONFIRMED` gigs worden klaargezet;
- niet-CONFIRMED gigs worden genegeerd;
- nieuwe CONFIRMED gig → exact één READY record;
- dezelfde sync nogmaals → geen duplicate;
- twee verschillende Gig IDs met dezelfde datum/titel → twee afzonderlijke records;
- bestaand publication-record wordt niet opnieuw overschreven;
- editable publication-data blijft behouden na volgende sync;
- Country wordt 1-op-1 overgenomen;
- geselecteerde READY regel kan worden omgezet naar correcte WordPress payload;
- payload bevat altijd `status: draft`;
- payload bevat altijd `we_artist: [13]`;
- payload bevat altijd `_wolf_event_currency: EUR`;
- Country wordt gemapt naar `_wolf_event_country_short`;
- `_wolf_event_country` wordt niet gevuld;
- Contact Email wordt correct gemapt;
- Contact Website wordt correct gemapt;
- Contact Name wordt niet gepubliceerd;
- Contact Phone wordt niet gepubliceerd;
- bestaande WP Event ID blokkeert een tweede create;
- succesvolle HTTP 201 verwerkt Event ID/status correct;
- succesvolle create maakt Last Error leeg;
- foutresponse resulteert in ERROR + Last Error;
- credentials worden niet gelogd;
- username wordt niet hardcoded;
- Application Password wordt niet hardcoded;
- triggerpad kan geen WordPress-create uitvoeren;
- handmatige sync gebruikt dezelfde synchronisatielogica als de trigger;
- dubbele hourly triggers worden voorkomen indien trigger-installatie onderdeel van de applicatie is;
- bestaande Calendar Sync-tests blijven slagen.

Mock externe WordPress HTTP-calls in geautomatiseerde tests.

Voer geen echte WordPress-create uit vanuit de testsuite.

---

# 27. Implementatie-aanpak

Maak vóór wijzigingen eerst een kort implementatieplan op basis van de daadwerkelijk aangetroffen repository.

Noem daarin:

- welke bestaande componenten hergebruikt worden;
- welke bestanden worden gewijzigd/toegevoegd;
- hoe `gig-input` wordt gelezen;
- hoe `website-publications` wordt benaderd;
- hoe menu-acties worden geïntegreerd;
- hoe de hourly trigger wordt ingericht;
- hoe dubbele triggers worden voorkomen;
- hoe WordPress-configuratie wordt opgeslagen;
- hoe secrets worden opgeslagen;
- hoe HTTP richting WordPress wordt geïsoleerd;
- hoe payload mapping wordt geïsoleerd;
- hoe idempotency wordt gegarandeerd;
- hoe ambiguous failures/retries veilig worden behandeld;
- welke tests worden toegevoegd.

Ga daarna pas implementeren.

Voorkom overengineering.

Deze feature heeft:

- één source: `gig-input`;
- één publication queue/worklist: `website-publications`;
- één externe consumer: WordPress.

Gebruik de bestaande architectuur waar mogelijk.

---

# 28. Bewezen Apps Script → WordPress referentie

Onderstaande Apps Script-call is tijdens de POC daadwerkelijk gebruikt om een WordPress Event Draft aan te maken.

De call resulteerde in:

- HTTP `201 Created`;
- WordPress Event ID `2049`;
- `status = draft`;
- correcte Wolf Events metadata;
- correcte koppeling met `we_artist = [13]`.

Gebruik dit als technische referentie voor het bewezen requestmodel.

Kopieer de functie NIET noodzakelijk letterlijk naar de productie-implementatie.

Pas hem aan de bestaande projectarchitectuur aan, met name voor:

- configuratie;
- secrets;
- HTTP-client abstractions;
- logging;
- foutafhandeling;
- response parsing;
- testbaarheid;
- scheiding tussen payload mapping en transport.

## Configuratiereferentie

De productiecode moet conceptueel configuratie ophalen:

```javascript
const wordpressBaseUrl = getConfiguredWordPressBaseUrl();
const username = getConfiguredWordPressUsername();
const applicationPassword = getConfiguredWordPressApplicationPassword();
```

Deze functienamen zijn uitsluitend illustratief.

Gebruik bestaande projectconventies indien daarvoor al configuratiehelpers bestaan.

Maak niet zonder noodzaak een tweede configuratiemechanisme.

## Bewezen requestmodel

Conceptueel:

```javascript
const credentials = Utilities.base64Encode(
  username + ':' + applicationPassword
);

const payload = {
  title: 'TEST - Miracle Gig Sync API',
  status: 'draft',

  we_artist: [13],

  meta: {
    _wolf_event_start_date: '31-12-2099',
    _wolf_event_venue: 'TEST VENUE',
    _wolf_event_location: 'TEST LOCATION',
    _wolf_event_city: 'TEST CITY',
    _wolf_event_country_short: 'NL',
    _wolf_event_currency: 'EUR'
  }
};

const response = UrlFetchApp.fetch(
  wordpressBaseUrl + '/wp-json/wp/v2/event',
  {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  }
);
```

Let op:

De productiepayload voor `website-publications` moet de definitieve mapping uit deze brief gebruiken.

Het bovenstaande is de POC waarmee de technische route is bewezen en bevat daarom niet noodzakelijk alle velden uit de uiteindelijke productiepayload.

---

# 29. Bewezen POC-response

De daadwerkelijke POC-call gaf:

```text
HTTP status: 201
```

De relevante delen van de response waren:

```json
{
  "id": 2049,
  "status": "draft",
  "type": "event",
  "title": {
    "raw": "TEST - Miracle Gig Sync API"
  },
  "meta": {
    "_wolf_event_start_date": "31-12-2099",
    "_wolf_event_end_date": "",
    "_wolf_event_venue": "TEST VENUE",
    "_wolf_event_location": "TEST LOCATION",
    "_wolf_event_city": "TEST CITY",
    "_wolf_event_country": "",
    "_wolf_event_country_short": "NL",
    "_wolf_event_state": "",
    "_wolf_event_time": "",
    "_wolf_event_address": "",
    "_wolf_event_zip": "",
    "_wolf_event_ticket": "",
    "_wolf_event_price": "",
    "_wolf_event_currency": "EUR"
  },
  "we_artist": [13]
}
```

Dit is bewezen gedrag van de huidige productie-WordPress-installatie.

De productie-implementatie voor `website-publications` moet dezelfde REST-route en hetzelfde WordPress/Wolf Events payloadmodel gebruiken, uitgebreid met de definitieve mapping uit deze brief.

---

# 30. Bewezen authenticatie

WordPress Application Password-authenticatie is afzonderlijk bewezen met:

```text
GET /wp-json/wp/v2/users/me
```

via HTTP Basic Authentication over HTTPS.

Conceptueel:

```javascript
const credentials = Utilities.base64Encode(
  username + ':' + applicationPassword
);

const response = UrlFetchApp.fetch(
  wordpressBaseUrl + '/wp-json/wp/v2/users/me',
  {
    method: 'get',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  }
);
```

Dit gaf tijdens de POC:

```text
HTTP 200
```

Daarmee is bewezen dat:

- Apps Script de Authorization header correct verstuurt;
- de webserver de Authorization header correct aan PHP/WordPress doorgeeft;
- WordPress Application Password-authenticatie werkt;
- geen custom authentication endpoint nodig is.

Gebruik voor productie dus:

```text
configured WordPress base URL
+
configured WordPress username
+
configured WordPress Application Password
+
HTTP Basic Authentication over HTTPS
```

Hardcode geen van deze verbindingsgegevens in de productiecode.

---

# 31. WordPress-plugin wijziging

De huidige custom WordPress-plugin registreert de Wolf Events meta-fields via `register_post_meta()`.

Voor deze feature moeten aanvullend worden geregistreerd:

```text
_wolf_event_email
_wolf_event_website
```

Gebruik dezelfde configuratie/conventie als de reeds geregistreerde Wolf Events string-meta.

De bestaande plugin heeft reeds bewezen dat deze aanpak werkt.

Wijzig geen code in Wolf Events zelf.

Als de WordPress-plugin buiten deze repository valt, lever dan als onderdeel van het resultaat de exacte benodigde wijziging/documentatie op, maar verzin geen repositorybestand dat niet bestaat.

---

# 32. Definition of Done

De feature is klaar wanneer minimaal het volgende aantoonbaar werkt:

1. Een nieuwe `CONFIRMED` gig in `gig-input` wordt door de publication-sync gevonden.

2. Er verschijnt exact één nieuwe `READY` regel in `website-publications`.

3. De juiste snapshotvelden worden gevuld.

4. Een tweede sync maakt geen duplicate.

5. Handmatige wijzigingen aan editable publication-fields worden door volgende syncs niet overschreven.

6. De hourly trigger kan dezelfde sync automatisch uitvoeren.

7. De gebruiker kan dezelfde sync ook handmatig starten.

8. Geen van beide syncpaden doet een WordPress-call.

9. De gebruiker kan expliciet een READY-regel selecteren en `Create WordPress draft` uitvoeren.

10. De juiste WordPress payload wordt opgebouwd.

11. De WordPress-call gebruikt configureerbare base URL, username en Application Password.

12. De WordPress-call maakt uitsluitend een draft aan.

13. Na HTTP 201 worden WP Event ID en WP Draft URL opgeslagen.

14. Status wordt `DRAFT_CREATED`.

15. Een bestaande WP Event ID voorkomt een tweede create.

16. Een duidelijke fout resulteert in `ERROR` + `Last Error`.

17. Credentials verschijnen nergens in logging.

18. Calendar Sync werkt nog exact zoals vóór deze feature.

19. Bestaande tests blijven slagen.

20. Nieuwe relevante tests slagen.

21. Er wordt geen echte WordPress-write uitgevoerd vanuit geautomatiseerde tests.

22. De implementatie bevat geen onnodige wijzigingen aan Wolf Events, Decibel, WordPress core of Calendar Sync.