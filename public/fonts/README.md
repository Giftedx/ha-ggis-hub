# Hub fonts

Self-hosted Old Standard TT, Latin subset.

**Source**: Google Fonts — https://fonts.google.com/specimen/Old+Standard+TT  
**License**: SIL Open Font License 1.1 (OFL-1.1)  
**Version**: v22 (as served by Google Fonts, May 2026)

## Files

| File | Style | Weight | Size |
|------|-------|--------|------|
| `old-standard-tt-latin-400.woff2`  | normal  | 400 | ~23 KB |
| `old-standard-tt-latin-400i.woff2` | italic  | 400 | ~25 KB |
| `old-standard-tt-latin-700.woff2`  | normal  | 700 | ~24 KB |

## Why this font

Old Standard TT is a 19th-century-revival humanist serif. It reads warmly at
body and caption sizes, holds italic well (the hub chrome is almost entirely
italic), and suits the painterly storybook bothy register without the
monospace/screen-tech associations that would clash with the Highland mood.

## Subsetting

These files are the Google Fonts `latin` subset:  
`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191-2193,
U+2212, U+2215, U+FEFF, U+FFFD`

This covers all glyphs the hub actually uses: Basic Latin, Latin-1 Supplement
(·), General Punctuation (', —), and the Arrows block (→).

## Updating

1. Fetch fresh URLs from `https://fonts.googleapis.com/css2?family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap`
   with a modern Chrome User-Agent (to get woff2).
2. Download the `/* latin */` @font-face src URLs.
3. Replace the three files here and bump the version comment in `src/style.css`.
