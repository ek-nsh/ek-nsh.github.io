---
title: Orbit
subtitle: Personal knowledge and resource manager for Android
order: 3
kind: orbit
seed: 37
sprite: orbit
area: Mobile · Knowledge management
status: Launched
question: Where did that link go?
answer: An Android app that gathers scattered web content, notes and media into one searchable place, and links related things together at the moment you save them.
beats:
  - ["Hub", "One place for links, notes and media"]
  - ["Schema", "Everything structured at the moment of saving"]
  - ["Reach", "100+ downloads; users in Mexico and Azerbaijan"]
threads: []
pos: [79, 28]
caption: "Illustration. Scattered items drift until they are saved, then settle into orbit and link to related ones. Click anywhere to save a new item."
---

## The lost link

We save things everywhere: a link in a chat, a note in one app, a video in another, a screenshot in the gallery. A week later none of it can be found. Orbit is an Android app that acts as a central hub for that scattered digital information, turning web content, notes and media into one searchable system.

## Structure at the moment of saving

The usual fix is to sort things later, which never happens. Orbit does the sorting when you save. I engineered a custom synchronisation engine and a structured data schema[^1] that categorise each item at that moment, along with templates of its own that automatically link related data points. For example, a link, a note about it and a video on the same topic can end up connected without any manual filing.

## Out in the world

I developed and launched Orbit as a real product rather than a demo. It has passed 100 downloads, and within its first month it had users in Mexico and Azerbaijan: the first sign that it was solving a problem beyond my own circle.

[^1]: The schema is the structure every saved item has to fit, so it can be searched and linked later.
