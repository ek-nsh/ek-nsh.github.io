---
title: SaaS Financial Simulator
subtitle: Causal decision engine for subscription businesses
order: 2
kind: ledger
seed: 23
sprite: ledger
area: Decision support · Simulation
status: In progress
question: Can a founder test a pricing, hiring or financing decision before making it?
answer: A deterministic graph of financial nodes carries every decision through cash, runway, MRR, churn, CAC and LTV, and every step is logged so any number can be traced back to its cause.
beats:
  - ["Graph", "Cash, runway, MRR, churn, CAC and LTV as one deterministic graph"]
  - ["Events", "Delta-based events with branch-and-replay"]
  - ["Audit", "Four logs, so every output can be explained"]
threads: [graphs, decisions, shows-work]
pos: [50, 62]
caption: "Illustration. Pick a decision and watch it travel through the graph one node at a time while the audit log writes it down. The arrows are directions, not forecasts."
---

## The idea

Founders make expensive, hard-to-undo decisions with a spreadsheet and a hunch: raise prices, hire two engineers, take the bridge round. The SaaS Financial Simulator is a forward-looking platform for testing those decisions before making them in the real world.[^1]

## A graph, not a spreadsheet

At the centre is a deterministic graph of financial nodes: cash, runway, monthly recurring revenue, churn, customer acquisition cost, lifetime value and the rest.[^2] A decision enters at one node and propagates through the edges, so you can see exactly which numbers it moved and why. Deterministic matters: the same decision on the same inputs always gives the same result, so nothing in the output is a mystery.

## Every output is traceable

State changes are recorded as deltas in an event system instead of overwriting numbers in place.[^3] That makes branch-and-replay possible: fork the timeline at a decision, try an alternative, and replay both. A four-log audit model keeps a record of what happened and why, so every output is fully traceable and explainable.

## Letting real data in

Projections are only useful if they can meet reality. A validated data-injection pipeline lets real-world inputs override projected values without compromising the integrity of the simulation, so the model can be corrected by what actually happened, safely.

[^1]: This one is still being built, so this page will grow with it.

[^2]: MRR is monthly recurring revenue, CAC is what it costs to win a customer, and LTV is what a customer is worth over their lifetime.

[^3]: A delta is a recorded change ("churn went up") rather than a new overwritten value, so the history behind every number can be replayed.
