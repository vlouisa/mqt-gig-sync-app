---

name: git-commit
description: Commit gereviewde wijzigingen van de huidige taak volgens de MQT Gig Sync commitconventies. Gebruik deze skill wanneer de gebruiker expliciet vraagt om een git commit.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Git commit

Commit uitsluitend de wijzigingen die bij de huidige taak horen.

## Werkwijze

1. Bekijk `git status --short`.
2. Inspecteer alleen de diff van gewijzigde bestanden die bij de huidige taak horen.
3. Controleer met `git diff --check` op whitespace- of patchproblemen.
4. Stage uitsluitend de bestanden die bij de huidige taak horen.
5. Controleer kort de staged diff.
6. Maak de commit.
7. Controleer dat de commit succesvol is gemaakt en rapporteer de gebruikte commit message.

Voer geen tests, code review of aanvullende repository-analyse uit, tenzij de gebruiker dit expliciet vraagt.

## Commit message

Gebruik:

```text id="c8klke"
<onderwerp>: <message>
```

Gebruik voor <onderwerp> een passend Conventional Commit-type, bijvoorbeeld:
- feat
- fix
- test
- docs
- refactor
- chore

De <message> moet in het Nederlands zijn.
Gebruik alleen Engelse woorden wanneer dit inhoudelijk logisch is, bijvoorbeeld voor technische termen, productnamen, code-identifiers of andere gangbare vaktermen.
Schrijf onderwerp en message in kleine letters, behalve waar hoofdletters inhoudelijk noodzakelijk zijn.

Voorbeelden:

```text id="43pq1e"
feat: voeg factuurreminder toe
fix: voorkom dubbele notificaties
test: voeg tests voor verlopen opties toe
docs: actualiseer projectinstructies
```
