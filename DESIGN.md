---
name: T-Green
description: Летний альбом. A summer scrapbook for a Tyumen student community, on the logo's own cream.
colors:
  paper: "#FEFAE9"
  print: "#FFFDF6"
  note: "#EEF5D3"
  ink: "#1E321C"
  ink-soft: "#4A5A41"
  leaf: "#B5DA66"
  leaf-mark: "#CBE688"
  moss: "#2B4A24"
  rust: "#B14A16"
  rust-hover: "#983D10"
  rust-ink: "#9A3F12"
  ink-faint: "#6A7461"
  placeholder: "#EDE7D2"
  backdrop: "rgba(23, 36, 21, 0.78)"
typography:
  display:
    fontFamily: "Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(2.45rem, 1.45rem + 4.4vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(2.05rem, 1.45rem + 2.7vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Golos Text, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.0625rem, 1.03rem + 0.18vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.6
  hand:
    fontFamily: "Caveat, Segoe Print, cursive"
    fontSize: "clamp(1.45rem, 1.3rem + 0.6vw, 1.85rem)"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  print: "2px"
  soft: "8px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 40px)"
  section: "clamp(72px, 10vw, 136px)"
  wrap: "1180px"
components:
  button-telegram:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.45em 0.8em 1.2em"
    height: "52px"
  button-telegram-hover:
    backgroundColor: "{colors.rust-hover}"
  button-copy:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
    height: "40px"
  print:
    backgroundColor: "{colors.print}"
    rounded: "{rounded.print}"
    padding: "10px 10px 12px"
  sticky-note:
    backgroundColor: "{colors.note}"
    rounded: "{rounded.print}"
    padding: "30px 26px 24px"
---

# Design System: T-Green

## Overview

A summer album the community made itself: real photos printed with off-white borders and taped to the page at small tilts, handwritten notes with little arrows, words marked with a lime highlighter, and strips of Tyumen birch bark between chapters. The page ground is the logo's own cream, so the logo sits on the page with no box. One deep moss band carries the signature tradition (squirrel houses). Light theme only, because the logo's background is part of the image.

## Colors

### Primary
- **Rust** `#B14A16`: the single action colour. Telegram buttons, the Sunday circle, check marks, the 100+ figure. Cream text on rust is 5.3:1.

### Secondary
- **Leaf** `#B5DA66` and **Leaf mark** `#CBE688`, sampled from the logo's TG letters: highlighter behind words, links and notes on the moss band, timeline "now" dot.

### Neutral
- **Paper** `#FEFAE9` (sampled logo background), **Print** `#FFFDF6`, **Note** `#EEF5D3`.
- **Ink** `#1E321C` (pine) for text, **Ink soft** `#4A5A41` for secondary text (7.2:1 on paper), **Ink faint** `#6A7461` for the weekday labels (4.7:1), **Moss** `#2B4A24` for the one dark band.
- **Placeholder** `#EDE7D2` behind photos while they load; **Backdrop** `rgba(23,36,21,.78)` behind the photo viewer.

### Named Rules
- **One action colour.** Rust is for doing things; nothing decorative is rust except the hand-drawn Sunday circle and the 100+ figure.
- **Handwriting is rust-ink on paper, leaf on moss.**

## Typography

- **Rubik** (700-800) for headings: chunky and rounded like the logo's TG.
- **Golos Text** (400-600) for reading: designed for Cyrillic.
- **Caveat** (600) only for short handwritten notes and photo captions, never for buttons or long text.
- All three are self-hosted WOFF2, Cyrillic + Latin subsets, in `site/assets/fonts/`.

### Hierarchy
Display (hero, Беличьи домики, Присоединяйтесь) > heading (section titles) > step-2 (sub-blocks) > body. Headings use `text-wrap: balance`; body uses `pretty`. "T-Green" and "15-летию" never break at the hyphen (`.nowrap`).

## Layout

Single column under 720px; the photo board becomes a horizontal swipe strip with scroll snap under 720px and a loose 12-column scrapbook grid above it. Two-column compositions (hero, about, houses, Sunday/padel, join) start at 880px. Content width 1180px, gutters `clamp(16px, 4vw, 40px)`.

## Elevation & Depth

Prints and notes lie on the paper with one soft warm shadow: `0 1px 2px rgba(62,50,20,.14), 0 14px 28px -16px rgba(62,50,20,.45)`. No hard offset shadows, no glass.

## Shapes

Paper things are almost square (2px). Actions are pills (999px). Focus rings, menu links, the skip link and the photo viewer use the soft 8px radius. Tilts between -2deg and 2deg on prints and notes only, never on text blocks that people read at length.

## Components

### Buttons
Rust pill with the Phosphor Telegram icon, label «Присоединиться в Telegram» everywhere. Press: `scale(0.97)` in 160ms. Hover darkens (pointer devices only).

### Navigation
Text wordmark plus four anchor links; wraps under the wordmark on phones, no hamburger.

### Print (signature)
Photo or video on an off-white border, translucent leaf tape at the top, handwritten caption below. Photos open the viewer (native `<dialog>`, arrows, swipe, Esc).

### Week strip (signature)
«пн вт ср чт пт сб вс» with Sunday circled by a hand-drawn rust stroke that draws itself once on scroll.

## Do's and Don'ts

### Do:
- Use the supplied photos and videos as the only documentary imagery, with honest captions.
- Keep every piece of information as real HTML text in Russian.
- Keep motion to the hero rise, prints settling, and the Sunday circle; respect reduced motion.

### Don't:
- Don't present drawings or stock images as photos of T-Green events.
- Don't add a second accent colour or a dark theme without boxing the logo.
- Don't put small labels above headings; let the heading speak (the hero name line «T-Green · Тюмень» is a user-approved exception).
