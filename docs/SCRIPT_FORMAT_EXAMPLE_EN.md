# Script Import Format Example

> Use this as the English reference format when preparing scripts for Moyin Creator.

> This is a structure reference, not a localization guarantee. The app may still keep some prompts, labels, and deeper references Chinese-first while accepting the same import structure.

---

## Format overview

```text
Title            -> "Project Title"
Synopsis         -> One paragraph summarizing the core story
Character Bio    -> Name (Age): identity, personality traits
Episode Title    -> Episode X: Title
Scene Header     -> Scene number + Day/Night + Interior/Exterior + Location
Characters       -> Characters: Character A, Character B
Stage Direction  -> Action or environment description beginning with △
Dialogue         -> Character Name: dialogue line
Performance Note -> (tone or action cue in parentheses)
Subtitle         -> [Subtitle: time or location note]
```

---

## Minimal example

```text
Title: "The Return"

Synopsis:
A failed startup founder returns to his hometown after a public collapse and discovers the one unfinished experiment that could change everything.

Character Bio:
Lin Xingye (28): failed founder, sensitive, stubborn, resilient
Su Xiao (27): mechanical engineer, rational, practical, outwardly cold but deeply loyal

Episode 1: The Fall and the Road Home

1-1 Day Interior New Harbor City Office
Characters: Lin Xingye, Su Xiao

△ Lin Xingye stuffs the last document into the shredder.

Su Xiao: The regulators are coming this afternoon.

Lin Xingye: I know.

[Subtitle: Same day, night]

1-2 Night Exterior Train Station
Characters: Lin Xingye

△ Rain lashes across the platform as he grips a worn canvas bag.

Lin Xingye: This time, I won't run.
```

---

## Formatting rules

- Keep scene headers consistent.
- Put speaker names before each line of dialogue.
- Use `△` for stage direction or visual action.
- Keep character names consistent across the full script.
- Use subtitles and transitions only when they are actually needed.

---

## Scene header pattern

```text
Episode-Scene Day/Night Interior/Exterior Location
```

Example:

```text
1-3 Night Exterior New Harbor City
```

---

## Recommended workflow

1. Write the script in this structure.
2. Import it into the `Script` panel.
3. Run scene, shot, and character calibration.
4. Continue into `Scenes`, `Director`, or `S-Class`.

## Notes for English users

- Keep the episode and scene structure consistent, even if the content is written in English.
- The importer cares more about structure than exact wording.
- If a workflow step appears Chinese-first in the UI or docs, treat this file as the English structural reference and use the workflow guide for the current product behavior.
