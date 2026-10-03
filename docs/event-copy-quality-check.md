# Redactionele kwaliteitscheck voor event-copy

Status: goedgekeurd door de gebruiker. De gebruiker heeft de publicaties op de
website geverifieerd en bevestigd dat ze voldoen aan de Miracle-norm.

Dit is de bevestiging van de redactionele acceptatie. De onderstaande proefset
blijft beschikbaar voor toekomstige wijzigingen aan de guidelines of generator.
Unit-tests controleren selectie, requestopbouw en begrenzing; de beoordeling van
de tekstkwaliteit is door de gebruiker op de website uitgevoerd.

## Werkwijze na afzonderlijke toestemming voor API-proeven

Gebruik de echte generator met onderstaande expliciete feiten als losse proefinput,
buiten de website-sync. Schrijf geen resultaten naar Sheets of WordPress en wis geen
bestaande beschrijvingen om generatie af te dwingen. Credentials blijven in de
gebruikelijke veilige configuratie; neem ze niet op in het verslag.

Beoordeel eerst compacte input en vervolgens rijke input. Houd de gegenereerde
teksten naast elkaar, zodat repetitieve openingen en slotzinnen zichtbaar zijn.
Bewaar bij de review modelnaam, resourcehash, input en output in een afgesproken
lokale reviewlocatie; zet volledige teksten niet in technische productielogs.

## Compacte proefset

Deze gegevens komen uit de door de gebruiker getoonde publicatieteksten. De
voorbeeldprijzen en showtimes uit de guidelines zijn hier bewust geen input.

| Stad | Datum | Venue | Interne titel indien bekend |
| --- | --- | --- | --- |
| Deinze | 3 October 2026 | Brielpoort | MQT @ LoR Deinze |
| Assen | 21 November 2026 | De Bonte Wever | MQT @ LoR Assen |
| Helmond | 17 December 2026 | Fletcher Wellness-Hotel | leeg |
| Wernhout | 14 November 2026 | Royal Palace | leeg |
| Libramont-Chevigny | 28 November 2026 | Halle aux Foires | leeg |

Verwacht: geen ongevraagde 17:00, geen ab-bookings-link, geen prijzen, geen
voorbeeldline-up en geen uitbreiding van `LoR` naar een onbevestigde eventnaam.

## Proef met expliciet thema

Gebruik voor een afzonderlijke Enschede-fixture de uitgeschreven interne titel
`LEGENDS of ROCK Tribute Festival – Made It In The Eighties Live`, datum
`19 December 2026`, venue `Metropool`, stad `Enschede`. Deze feiten zijn voor
deze proef expliciet aangeleverd in de brief. Voeg geen tijden, prijzen of andere
acts toe: juist die mogen niet vanuit het gelijknamige voorbeeld binnenkomen.

Verwacht: de eighties-insteek werkt door in de copy, zonder overgenomen showtime,
doors-open tijd, ticketprijs of gegarandeerde songs. Deze fixture verandert geen
productiegegevens en voegt geen nieuwe Sheet-kolommen toe.

## Beoordeling

- Klinkt de tekst als een aankondiging vanuit Miracle, met de goedgekeurde bandcontext?
- Wisselen opening, ritme, opbouw en slot tussen de events?
- Is er meer inhoud dan datum, adres en website in drie zinnen?
- Zijn praktische regels betrouwbaar en datums natuurlijk Engels?
- Blijven afkortingen, onduidelijke tijden en boekingswebsites buiten de copy?
- Gebruikt een thema alleen feiten uit de actuele proefinput?
- Zijn de teksten vrij van geleende voorbeeldfeiten en beloofde setlists?

Een feitelijke fout is reden voor aanpassing en een nieuwe proef, ook wanneer de
automatische kwaliteitscontrole de tekst accepteert. Publiceer pas na menselijke controle.
