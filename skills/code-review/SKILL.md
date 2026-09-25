---

name: code-review
description: Voer een kritische code review uit op wijzigingen in MQT Gig Sync. Gebruik deze skill wanneer de gebruiker vraagt code, een implementatie, diff of recente wijzigingen te reviewen.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Code review

Review de daadwerkelijke implementatie kritisch zonder de code automatisch te wijzigen.

## Doel

Zoek primair naar concrete problemen met:

* correctheid;
* bestaand gedrag;
* regressierisico;
* foutafhandeling;
* side effects;
* dataconsistentie;
* security en secrets;
* Apps Script-runtimegedrag;
* Google Sheets-, Calendar- en Gmail-integraties;
* externe MQT-librarycontracten;
* concurrency en triggers.

Geef functionele problemen en regressierisico's voorrang boven stijlvoorkeuren.

## Scope

Bekijk niet uitsluitend de gewijzigde regels.

Inspecteer waar relevant:

* de volledige gewijzigde functie of service;
* callers van gewijzigde publieke functies;
* relevante configuratie;
* statusovergangen;
* Sheet-contracten;
* externe librarycontracten;
* tests;
* foutafhandeling en logging;
* side effects;
* globale functies en stringreferenties wanneer namen zijn gewijzigd.

Beoordeel de wijziging binnen de bestaande architectuur.

Adviseer geen brede refactoring wanneer de implementatie binnen die architectuur correct en voldoende onderhoudbaar is.

Bestaande technische schuld buiten de wijziging is geen finding, tenzij de nieuwe wijziging hierdoor aantoonbaar fout gedrag introduceert of het probleem verergert.

## Onafhankelijke review

Gebruik waar mogelijk een ander AI-model dan het model dat de wijziging heeft geïmplementeerd.

De reviewer:

* beoordeelt de daadwerkelijke implementatie onafhankelijk;
* wijzigt tijdens de review geen code;
* beoordeelt implementatie in plaats van de intentie of redenering van het implementerende model;
* neemt eerdere conclusies niet automatisch over.

Wanneer geen ander model beschikbaar is, mag hetzelfde model reviewen. Vermeld dan dat geen onafhankelijke modelreview heeft plaatsgevonden.

## Findings

Rapporteer alleen concrete findings met redelijke technische onderbouwing.

Classificeer als:

* **Kritiek** — risico op dataverlies, securityproblemen, verkeerde productiegegevens of ernstige uitval;
* **Hoog** — waarschijnlijk functioneel probleem of aanzienlijk regressierisico;
* **Middel** — daadwerkelijk probleem met beperkte impact of specifieke omstandigheden;
* **Laag** — kleine maar concrete relevante verbetering.

Vermeld per finding:

* bestand en relevante functie of regel;
* het probleem;
* wanneer het optreedt;
* mogelijk gevolg;
* gerichte oplossingsrichting.

Maak onderscheid tussen:

* aangetoond probleem;
* waarschijnlijk probleem;
* mogelijk risico dat niet volledig kan worden vastgesteld.

Presenteer onzekerheid niet als vastgesteld defect.

## Geen findings

Rapporteer niet als finding wanneer iets uitsluitend gaat om:

* persoonlijke stijlvoorkeur;
* theoretische architecturale zuiverheid;
* formatting zonder functionele gevolgen;
* bestaande code buiten scope;
* een hypothetisch probleem zonder realistisch uitvoeringspad;
* onnodige brede refactoring;
* een functioneel correcte en acceptabele afwijking van een patroon.

Maximaliseer signal-to-noise.

## Tests

Controleer waar relevant of tests:

* het gewijzigde gedrag daadwerkelijk afdekken;
* relevante grens- en foutscenario's meenemen;
* betekenisvolle assertions bevatten;
* niet alleen zijn aangepast om de implementatie groen te krijgen;
* regressies voldoende afdekken.

Ontbrekende tests zijn alleen een finding wanneer daardoor een betekenisvol regressierisico ontstaat.

Volg voor het daadwerkelijk uitvoeren van tests altijd de veiligheidsregels uit `AGENTS.md`.

## Resultaat

Begin met findings, gesorteerd van hoogste naar laagste ernst.

Als er geen concrete findings zijn, vermeld dit expliciet.

Benoem daarna kort waar relevant:

* resterende risico's of onzekerheden;
* tests die niet zijn uitgevoerd;
* gedrag dat niet kon worden vastgesteld;
* vragen die nodig zijn om een mogelijke finding te bevestigen.

Wijzig tijdens de review geen code tenzij de gebruiker daar expliciet opdracht voor geeft.

## Afhandeling van findings

Wanneer de review onderdeel is van een implementatieworkflow, laat waar mogelijk het oorspronkelijke implementerende model de findings beoordelen en verwerken.

Het implementerende model:

1. controleert iedere finding tegen implementatie, callers en contracten;
2. accepteert findings niet automatisch;
3. motiveert findings die niet van toepassing of bewust acceptabel zijn;
4. verwerkt terechte findings met de kleinst mogelijke gerichte wijziging;
5. controleert de relevante code opnieuw;
6. past tests aan of voegt tests toe wanneer nodig;
7. rapporteert welke findings zijn verwerkt en welke zijn afgewezen.

Een finding is advies en geen automatische opdracht tot wijziging.

Leg findings die een brede architectuur-, schema- of extern-contractwijziging vereisen eerst aan de gebruiker voor.

## Herreview

Voer waar praktisch opnieuw een onafhankelijke review uit wanneer:

* een finding met ernst **Kritiek** of **Hoog** is opgelost;
* de oplossing meerdere applicatieonderdelen raakt;
* een publiek contract verandert;
* status-, synchronisatie- of datagedrag verandert.

Voorkom eindeloze reviewcycli voor kleine wijzigingen.

Een afgeronde review geeft geen toestemming voor commit, push of deployment.
