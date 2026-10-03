# FEAT-008 — Google Maps-widget in websitepublicaties

Nieuwe websitepublicaties krijgen `Google Maps Embed` direct na `Price`.
De HTML bevat een responsive div en een Google Maps-iframe van maximaal 520 bij
400 pixels, met zoomniveau 12 en taal Engels, overeenkomstig de aangeleverde
widget. `gig-input.Location` wordt getrimd en als URL-gecodeerde zoektekst gebruikt.
Een lege locatie geeft een leeg widgetveld. Er zijn geen netwerkverzoeken bij het
genereren, geen API-key, reclame-link of script van de externe generator.

De gebruikte `maps.google.com/maps?...&output=embed`-URL volgt het aangeleverde
voorbeeld; dit is niet de officiële Maps Embed API. De weergave moet nog op de
doelwebsite worden gecontroleerd.

## Bestaand tabblad migreren

Na deployment voert de beheerder één keer **Beheerpaneel > Onderhoud > Richt
websitewerkvoorraad in** uit. Alleen het bekende oude schema met 17 headers wordt
uitgebreid. De nieuwe kolom wordt ingevoegd; overige cellen blijven behouden.
De actie stelt de kolombeveiliging opnieuw in. De widgetkolom is een gegenereerd,
beschermd veld. Een herhaalde inrichting voegt geen tweede kolom toe.

Tot de migratie zijn websiteacties op het oude schema geblokkeerd met een melding.
Een onbekend schema wordt afgewezen. Een lege ingevoegde kolom na een onderbroken
migratie kan bij opnieuw inrichten worden afgerond.

Bestaande publicaties houden een leeg widgetveld. Deze wijziging vult ze niet
achteraf aan. Net als andere snapshots worden bestaande widgets niet overschreven
wanneer de bronlocatie verandert. Bij de handmatige actie **Maak WordPress-concept**
stuurt de mapper `Google Maps Embed` mee als `meta._wolf_event_map`. Een leeg
widgetveld wordt als lege string verstuurd. Werkvoorraadsynchronisatie maakt geen
WordPress-aanroep. HTML staat als tekst in de Sheet en wordt daar niet uitgevoerd.

Hiervoor moet de WordPress-supportplugin `_wolf_event_map` via REST registreren
met een aparte HTML-sanitizer. De [referentieversie 0.2.7](../wordpress/miracle-gig-sync-api-support-latest.md)
bevat deze registratie. De sanitizer laat iframe-attributen toe en verwijdert de
omhullende div. Installatie en weergave op de echte website zijn niet lokaal geverifieerd.

Lokale tests controleren adrescodering, lege locaties, behoud van snapshots,
migratie, behoud van bestaande gegevens en doorgifte van gevulde en lege embeds
in de REST-payload. Productie en echte kaartweergave zijn
niet getest.
