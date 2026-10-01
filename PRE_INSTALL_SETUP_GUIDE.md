# Storyboard Forge - Pre-Install Setup Guide

## Storyboard Forge Issue Resolution Guide

### March 7 Update
### V0.2.2 Release

Important: before installing the new version, uninstall the old version first, then install the new version in a different folder path.

### Download links

- [GitHub repository](https://github.com/lioneltchami/storyboard-forge)
- [GitHub releases](https://github.com/lioneltchami/storyboard-forge/releases)

### Installation and usage tutorial

- [Bilibili tutorial channel](https://space.bilibili.com/612396586)

---

## Troubleshooting

### Question 0

For service mapping, when you choose a model, go to the API website and create a new token with the matching group selected.

If you are unsure, check the configuration examples below.

### Question 1

If you still have configuration problems, refer to the tutorial and screenshots below.

### Question 2

For video generation load, the same rule applies. ByteDance-side servers are often heavily loaded, so add more token keys to improve throughput.

### Question 3

It is recommended to add multiple keys so the app can rotate between them.

Single-thread and multi-thread behavior can be enabled in Settings.

### Question 4: White screen

- The macOS version is still under development.
- If Windows shows a white screen, it may be because the Windows installation is missing components.
- Install Microsoft Visual C++ 2015-2022 Redistributable (x64), then restart the computer.

### Question 5: Importing a full script causes errors

If script import fails, format the screenplay using the structure below.

#### Full format

```text
《Script Title》

Outline:
Write the overall story summary for the whole project or current import here.

Character Bios:
Character A (25): identity, personality, appearance, relationships, background.
Character B (32): identity, personality, appearance, relationships, background.

Episode 1: Episode Title

1-1 Day Interior Location
Characters: Character A, Character B
[Subtitle: Summer 2002]
△ Environment / action description
Character A: (action or tone) dialogue
Character B: dialogue

1-2 Night Exterior Another Location
Characters: Character A
△ Action description
Character A: dialogue

Episode 2: Episode Title

2-1 Morning Interior Location
Characters: Character C
△ Action description
Character C: dialogue
```

#### Blank format

```text
《Script Title》

Outline:
Write the story summary for the whole project here.

Character Bios:
Character A (25): identity, personality, appearance, background.
Character B (32): identity, personality, appearance, background.

Episode 1: Episode Title

1-1 Day Interior Location
Characters: Character A, Character B
[Subtitle: Summer 2002]
△ Environment or action description
Character A: (action / tone) dialogue
Character B: dialogue

1-2 Night Exterior Location
Characters: Character A
△ Action description
Character A: dialogue

Episode 2: Episode Title

2-1 Morning Interior Location
Characters: Character C
△ Action description
Character C: dialogue
```

#### Formatting rules

- You must include `Episode X` as the episode marker
- Each scene should ideally use a header such as `1-1 Day Interior Location`
- It is recommended to include `Characters: Character A, Character B`
- Dialogue should be written as `Character: line` or `Character: (action) line`
- Action descriptions should start with `△`
- Subtitles, flashbacks, and similar items should be written as `[Subtitle: ...]` or `[Flashback]`
- It is best to include `Outline:` and `Character Bios:` so the system can recognize the story and characters more accurately

#### Additional notes

- `Outline:`, `Character Bios:`, `Episode X`, and scene headers can all be bolded if you want
- If there is no explicit `Episode X`, the system treats the import as a single-episode screenplay
- The more standard the scene headers are, the more accurately the importer can split scenes

---

If you still cannot format the script, you can paste it into an AI tool and ask it to convert it into the required format before importing.

Example:

https://ima.qq.com/share/#/ai-chat/Y4MweaasJ

### Question 6

If model selection causes issues, switch to a different model or choose `Auto` for automatic grouping.

### Question 7: Image host failure

The default image host is now SCDN. Other options were removed.

---

## S-Class / Seedance 2.0 Basic Tutorial

Important:

- Add an API key before using this module
- The official release is still in public beta
- Character generation requires access approval
- This project is open-source and self-tested, and it is currently in a gray-scale test phase
- Feedback and suggestions are welcome

### Tutorial steps

1. [Image]
2. [Image]
3. [Image]
4. [Image]
5. [Image]
6. Mode 1: Standard grouping
7. Mode 2: 3x3 grid grouping

### Additional examples

1. [Image]
2. [Image]
3. Mode 3: Single-scene generation

[Image]
[Image]
[Image]
