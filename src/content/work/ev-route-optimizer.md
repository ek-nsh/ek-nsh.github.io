---
title: EV Route Optimizer
subtitle: Battery-aware navigation and decision support
order: 4
kind: route
seed: 41
sprite: route
area: Decision support · Full stack
status: Prototype
question: Is the shortest route the right route for an electric car?
answer: It scores real route alternatives on expected battery use, reliability of arrival and travel time, and shows the energy calculations behind each recommendation.
beats:
  - ["Energy", "A physics-based model with weather, elevation and driving style"]
  - ["Score", "One explainable score for time, battery and reliability"]
  - ["Map", "Open mapping, routing, elevation, weather and charger data"]
threads: [decisions, shows-work]
pos: [68, 74]
caption: "Illustration. Three routes between A and B, each with its own trade-off. Hover a route to compare; click to hold it."
---

## Beyond shortest path

Ordinary navigation optimises for time. For an electric car the question is different: will I arrive, with how much charge left, and can I trust that estimate? This platform recommends routes based on expected battery usage, reliability of arrival and travel time, together.[^1]

## A hybrid decision engine

Real-world route alternatives go through a physics-based energy model that accounts for weather and elevation, then through a layer that accounts for driver behaviour and for uncertainty in all of the above. The results are combined into one uncertainty-aware score inside a single explainable system.[^2]

## Open data, full stack

I integrated open mapping, routing, elevation, weather and charging-station APIs into a full-stack prototype with an interactive, map-based interface.

## Showing the maths

The platform presents the fastest, the most energy-efficient and the most reliable route, and justifies each recommendation with route-level energy calculations instead of a bare ETA. You can see why a slightly slower route wins.

[^1]: Reliability of arrival: how likely the car is to reach the destination with charge to spare, given everything uncertain along the way.

[^2]: Uncertainty-aware means a route whose energy estimate is shaky is scored as riskier than one with the same average but a tighter range.
