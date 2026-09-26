# small-change

Gebruik deze skill alleen voor kleine, laag-risico wijzigingen waarbij geen nieuw functioneel gedrag wordt toegevoegd.

Geschikt voor:
- bestand of symbool hernoemen;
- imports/references bijwerken;
- kleine configuratiewijzigingen;
- eenvoudige housekeeping;
- documentatie- of naamgevingscorrecties.

Werkwijze:
1. Inspecteer alleen de direct relevante bestanden en references.
2. Voer de kleinste gerichte wijziging uit.
3. Zoek naar achtergebleven references.
4. Voer alleen relevante, goedkope checks/tests uit.
5. Escaleer naar `implement-feature` wanneer:
   - gedrag verandert;
   - meerdere domeinen of logische flows geraakt worden;
   - regressietests nodig zijn vanwege functionele impact;
   - de wijziging complexer blijkt dan verwacht.