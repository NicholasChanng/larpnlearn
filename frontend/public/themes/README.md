# Theme asset-sourcing guide

**Owner: Track-6 (Content/Data).**

Each theme ships a `manifest.json` that references sprite, music, and SFX paths. The manifests are authoritative — populate the asset dirs to match.

For the demo, target the **Greek** theme first (it's our default). Mario and Pokémon can land in later PRs without blocking anyone.

## Folder layout per theme

```
public/themes/{theme_id}/
├── manifest.json        ← already written
├── bg/                  ← segment backdrops (1920×1080 recommended, pixel art)
├── sprites/             ← monster sprite sheets (48×48 or 64×64, 3–4 frames)
├── avatars/             ← player character sprite sheets (same size as monsters)
├── music/               ← looping background music per segment
└── sfx/                 ← one-shot attack/hit/victory/defeat sounds
```

Manifest fields tell you exactly which files each theme needs. Use the manifest as a shopping list.

## Licensing rules

- Everything committed to this repo must be **CC0** or a permissive license we can ship with attribution in the credits screen.
- **Never commit ripped assets** from commercial games. Pokémon sprite rips, Mario sprite rips, and copyrighted music are a demo disqualifier. Use inspired-by / look-alike assets from open libraries.
- When in doubt: OpenGameArt.org, itch.io's "free assets" tag (filter for CC0 or CC-BY).

## Greek — authentic Odyssey references

Source images/audio should evoke:

- **Olympus (levels 1–3):** sun-drenched marble, Corinthian columns, golden cloud-top, lyre + horn orchestral fanfare.
- **Athens (4–6):** warm ochre streets, olive groves, daytime civic lyre music.
- **Aegean (7–9):** storm-tossed blue ocean, fragile trireme, choir + low strings.
- **Island (10–12):** untamed jungle/rocks, primal drums, aulos.
- **Underworld (13–16):** black and crimson fog, skulls, choral bass + timpani.

**Recommended pixel-art packs (CC0 / CC-BY):**
- [OpenGameArt — "Greek Mythology pixel pack"](https://opengameart.org/) (search "Greek")
- [itch.io — "Ancient World" free asset packs](https://itch.io/game-assets/free)

**Music references:**
- OpenGameArt "Mythos" pack
- Freesound.org "orchestral cinematic" filtered to CC0

**SFX references:**
- Sword slash: Freesound "sword whoosh"
- Oracle chime: Freesound "chime"
- Siren song: Freesound "female vocal"
- Kraken/Underworld: Freesound "deep bass drone"
- Hades fire: Freesound "roar fire"
- Thunder (Zeus): Freesound "thunder crack"

## Pokémon — authentic Kanto references

- Avoid ripped sprites. Use look-alike elemental creatures: "Electric Mouse," "Fire Lizard," "Water Turtle."
- Backgrounds: NES-era 8×8 tilesets from itch.io (search "gbc tileset", "jrpg route tileset", "cave tileset").
- Music: chiptune from the [OpenGameArt "chiptune" tag](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12&sort_by=count&sort_order=DESC).
- SFX: retro 8-bit pack from OpenGameArt.

## Mario — authentic Bowser journey references

- Use look-alike sprites ("Plumber Hero," "Mushroom Enemy," "Shell Turtle"). **Do NOT commit ripped Nintendo sprites.**
- Backgrounds: OpenGameArt "platformer" packs, especially overworld / castle / water / sky biomes.
- Music: original 6/8 bouncy overworld, minor-key underground, march-time airship — all available on OpenGameArt "platformer music".
- SFX: coin pickup, power-up, jump, stomp — OpenGameArt "retro platformer SFX".

## How the frontend consumes these

The frontend's `CharacterSprite` component falls back to the emoji defined in the manifest when no sprite image exists, and the `audio` manager silently no-ops on missing audio files. **Drop files into the dirs as you source them — the UI picks them up immediately with no code changes required.**

Once you have real sprite sheets instead of static images, coordinate with Track-2 (Frontend-Battle) to swap the emoji `<span>` for a CSS `animation: steps(N) …` over a sprite atlas.

## Checklist for demo day

- [ ] Greek — all 5 segment BGs
- [ ] Greek — all 16 monster sprites (or at minimum: the current level's + next two)
- [ ] Greek — all 3 avatar sprites
- [ ] Greek — all 5 segment music loops
- [ ] Greek — attack/hit/victory/defeat SFX
- [ ] Pokémon manifest assets (stretch)
- [ ] Mario manifest assets (stretch)
- [ ] Credits screen listing every source with license
