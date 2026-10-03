# FEAT-009 — AI-eventbeschrijving

`website-publications` heeft 19 kolommen. `Event Description` staat direct na
`Google Maps Embed` en vóór `WP Event ID`. Het is een bewerkbaar tekstveld met
regelterugloop. De bestaande inrichtingsactie migreert de bekende schema's met
17 en 18 headers en herstelt een onderbroken insertie met een lege kolom/header.
Waarden en technische IDs blijven behouden; onbekende schema's worden afgewezen.

## Generatie en behoud

De normale website-sync bewaart eerst nieuwe snapshots en genereert daarna alleen
voor de in diezelfde run toegevoegde IDs een beschrijving. Bestaande publicaties
worden nooit geselecteerd, ook niet bij een lege beschrijving. Handmatige teksten
blijven behouden; leegmaken veroorzaakt geen nieuwe generatie. Een fout verwijdert
de rij niet en wijzigt geen status, WordPress-ID of `Last Error`.

Alle automatische invulling is AI-output. `gig-input.Description` wordt nooit
gekopieerd, als promptinput gebruikt of als fallback opgeslagen. De generator
ontvangt uitsluitend interne titel, datum, zaal, plaats, land, adres, postcode,
ticketlink en prijs uit de publicatiesnapshot. Geen volledige
bronrij, persoonsgegevens uit contactvelden of kaart-HTML. Een bronwijziging
ververst de snapshot niet automatisch.

## Centrale schrijfregels

[knowledge/event-copy-guidelines.md](../../knowledge/event-copy-guidelines.md) is de
enige handmatig onderhouden bron voor de schrijfstijl. Hierin staan de goedgekeurde
bandcontext, vier volledige stijlvoorbeelden, een afgekeurd voorbeeld, praktische
regels en instructies voor variatie. Voorbeelden zijn nooit evenementfeiten, ook
niet wanneer de stad overeenkomt. De AI mag geen tijden, prijzen, line-ups of
productieclaims uit die voorbeelden overnemen.

De tekst mag headlines en praktische regels bevatten en varieert in lengte:
100–160 woorden voor compacte copy, 150–250 regulier en 200–350 bij rijke context.
Dit zijn richtlijnen zonder verplicht aantal alinea's. Bandcontext mag energie
toevoegen, maar geen gegarandeerde setlist of onbekende evenementdetails.

`Start` wordt niet aan AI doorgegeven omdat de betekenis onvoldoende vaststaat.
`Contact Website` wordt niet als evenement- of ticketwebsite aangeboden. De titel
heet in de AI-input `internalTitle`; afkortingen zoals `LoR` mogen niet worden
uitgebreid tot een aangenomen eventnaam. Datums worden in de Apps Script-tijdzone
omgezet naar bijvoorbeeld `28 November 2026`. Er zijn geen nieuwe bronvelden voor
showtime, deuren open, thema of andere acts toegevoegd.

`npm run build:guidelines` bouwt de Markdown naar
`generated/event-copy-guidelines.js`, inclusief bronpad en SHA-256-hash. Deze
gegenereerde resource wordt samen met de bron in Git bijgehouden. De provider
levert de inhoud bij iedere generatie als `instructions`; `eventData` blijft
afzonderlijke JSON-input. Een ontbrekende of lege resource blokkeert generatie.
De unit-testconfiguratie controleert dat de resource actueel is. `clasp push`
doet zelf geen build; zie de [deploymentinstructies](../../README.md).

De beperkte kwaliteitscontrole wijst onder meer teksten onder 70 woorden, vrijwel
uitsluitend praktische regels, ISO-datums, de bekende droge opening, de afsluiting
“For more information, visit” en markup af. Het minimum is een grove ondergrens,
geen garantie van kwaliteit. Een afgekeurd antwoord krijgt maximaal één nieuwe
generatie met concrete feedback, zolang budget en ongewijzigde rij dat toelaten.
Deze heuristieken bewijzen geen feitelijkheid, originaliteit of variatie tussen runs.

## OpenAI en configuratie

Script Properties:

| Property | Default / betekenis |
| --- | --- |
| `OPENAI_API_KEY` | Verplicht; uitsluitend in Script Properties opslaan |
| `OPENAI_MODEL` | `gpt-5.4-mini`; kies een Responses-model dat `reasoning.effort: none` ondersteunt |
| `EVENT_DESCRIPTION_PROVIDER` | `openai`; andere providers vereisen een adapter |
| `EVENT_DESCRIPTION_MAX_CALLS` | `5`; geheel getal van 1 t/m 20 |

De kleine HTTP-adapter gebruikt de [Responses API](https://developers.openai.com/api/docs/guides/text),
zonder SDK, tools of directe retries, met `store: false` en maximaal 1200 outputtokens.
De modelkeuze en configuratie worden pas gelezen wanneer nieuwe publicaties een beschrijving nodig hebben.
Ontbrekende/ongeldige configuratie laat snapshots intact en doet geen API-aanvragen.
HTTP 400, 401, 403, 404 of 429 beëindigt de AI-pogingen voor die run.

Per nieuwe publicatie maximaal twee aanvragen: de eerste generatie en eventueel
één kwaliteitsherkansing. Beide tellen mee voor het ingestelde totale aantal
API-aanvragen per run (standaard vijf). HTTP-fouten, netwerkfouten, geweigerde en
onvolledige responses veroorzaken geen kwaliteitsherkansing.
Bij fouten of het bereiken van de limiet blijven nieuwe beschrijvingen leeg, zonder
automatische vervolgpoging. De oude property `EVENT_DESCRIPTION_LAST_GIG_ID` wordt
niet meer gelezen of geschreven en mag worden verwijderd.
Na drie minuten sinds het begin van de sync start geen volgende aanvraag. Een lopende
UrlFetch-aanvraag kan die grens overschrijden; dit is geen harde HTTP-timeout.
De bestaande ScriptLock blijft tijdens deze workflow vastgehouden.

Vlak voor opslaan worden identiteit, beschrijving en context opnieuw gelezen.
Bij een tussentijdse wijziging wordt het antwoord weggegooid. ScriptLock sluit
handmatige Sheet-bewerkingen niet uit: een wijziging exact tussen laatste controle
en write kan niet atomair worden voorkomen. Bewerk bij voorkeur na afronding van de sync.

Technische logs registreren gegenereerde, behouden en mislukte beschrijvingen.
Geen teksten, prompts, responsebodies of credentials in logs. Het beheerpaneel
toont voor de nieuwe publicaties aantallen gegenereerd, mislukt en nog leeg, plus ontbrekende configuratie.

## WordPress

De mapper verstuurt de opgeslagen tekst letterlijk als native `content`, inclusief
alinea's. Een lege beschrijving blijft toegestaan. De WordPress-create genereert
nooit tekst en werkt bestaande concepten niet bij. Wolf-meta, Maps en de bestaande
afspraak over `_wolf_event_time` blijven behouden. Geen pluginwijziging nodig.

## Verificatie

Lokale tests gebruiken uitsluitend in-memory Sheets en HTTP-mocks. Ze controleren
generatie voor nieuwe IDs, bronisolatie, behoud van bestaande lege en gevulde regels,
limieten inclusief kwaliteitsherkansingen, ontbreken van retries bij HTTP-fouten,
configuratiefouten, antwoordvalidatie, gelijktijdige wijzigingen,
migratie/herstel en de WordPress-payload zonder AI-aanroep.

De gebruiker heeft de publicaties op de website geverifieerd en bevestigd dat ze
voldoen aan de Miracle-norm. Daarmee is de redactionele acceptatie bevestigd.
De [kwaliteitscheck](../event-copy-quality-check.md) blijft beschikbaar voor
toekomstige wijzigingen en schrijft geen bestaande publicaties over.
