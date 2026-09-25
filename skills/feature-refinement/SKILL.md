---

name: feature-refinement
description: Onderzoek en refine een feature voor MQT Gig Sync voordat deze wordt geïmplementeerd. Gebruik deze skill wanneer de gebruiker vraagt een feature, idee of wijziging te refinen, uit te werken of technisch te ontwerpen zonder deze direct te implementeren.
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Feature refinement

Onderzoek en ontwerp de gevraagde feature binnen de bestaande repository zonder code te wijzigen.

## Doel

Maak vóór implementatie duidelijk:

* welk probleem de feature oplost en welke waarde deze heeft;
* wat de functionele requirements zijn;
* welke bestaande componenten geraakt worden;
* welke bestaande infrastructuur kan worden hergebruikt;
* welke nieuwe componenten eventueel nodig zijn;
* welke risico's en edge cases bestaan;
* hoe de feature getest kan worden;
* wanneer de feature als afgerond kan worden beschouwd.

## Repositoryonderzoek

Onderzoek alleen wat relevant is voor de feature.

Inspecteer waar nodig:

* bestaande domeinmodellen en services;
* callers en afhankelijkheden;
* bestaande infrastructuur die kan worden hergebruikt;
* Sheets en datacontracten;
* configuratie;
* triggers;
* logging en audit;
* externe MQT-libraries en hun contracten;
* bestaande tests;
* foutafhandeling;
* idempotency en concurrency.

Ga niet uit van een nieuwe architectuur wanneer de bestaande architectuur het probleem al ondersteunt.

Geef voorkeur aan uitbreiding en hergebruik van bestaande componenten boven parallelle infrastructuur.

## Refinement-resultaat

Werk na het repositoryonderzoek uit:

### 1. Probleem en waarde

Beschrijf het concrete probleem en waarom de feature waarde toevoegt.

### 2. Huidige situatie

Beschrijf alleen de bestaande componenten, processen en datacontracten die relevant zijn voor deze feature.

### 3. Functionele requirements

Beschrijf concreet wat de feature functioneel moet doen.

### 4. Voorgestelde oplossing

Beschrijf hoe de feature binnen de bestaande architectuur kan worden gerealiseerd.

### 5. Impact

Benoem bestaande bestanden, services, domeinobjecten, Sheets, triggers of externe libraries die waarschijnlijk geraakt worden.

### 6. Nieuwe componenten

Benoem alleen nieuwe componenten die daadwerkelijk nodig lijken en leg uit waarom bestaande componenten niet volstaan.

### 7. Data en persistentie

Beschrijf eventuele wijzigingen aan Sheets, properties, configuratie of andere persistente data.

### 8. Foutscenario's en edge cases

Beschrijf relevante grensgevallen, foutscenario's, concurrencyproblemen en risico's op dubbele verwerking.

### 9. Teststrategie

Beschrijf welke unit-tests en eventuele integratietests nodig zijn.

### 10. Acceptance criteria

Formuleer concrete en verifieerbare criteria voor afronding.

### 11. Openstaande beslissingen

Benoem alleen keuzes waarvoor input van de gebruiker daadwerkelijk nodig is voordat implementatie verstandig is.

## Grenzen

Tijdens refinement:

* wijzig geen productiecode;
* voeg geen tests toe;
* wijzig geen Sheets of andere persistente data;
* commit of push niets;
* presenteer aannames expliciet als aannames;
* stel alleen vragen wanneer een relevante functionele keuze niet uit de repository of opdracht kan worden afgeleid.

Begin pas met implementeren nadat de gebruiker daar expliciet opdracht voor geeft.
