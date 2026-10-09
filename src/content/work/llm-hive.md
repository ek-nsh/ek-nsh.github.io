---
title: LLM Hive
subtitle: Distributed local-LLM orchestration system
order: 1
kind: hive
seed: 11
sprite: hive
area: Distributed systems · AI infrastructure
status: Built
question: How do you make a handful of ordinary machines behave like one inference fleet?
answer: Every machine running Ollama polls the hub outbound, so the hub can coordinate workers on a LAN or behind a tunnel without ever reaching in, and still see and steer the whole fleet.
beats:
  - ["Fleet", "Ollama machines become one coordinated inference fleet"]
  - ["Engine", "Workflows run as DAGs and replan when a node drops"]
  - ["Link", "Workers poll outbound; the hub keeps full visibility"]
threads: [graphs, decisions, shows-work]
pos: [22, 30]
caption: "Illustration, not a recording. Workers poll the hub, tasks flow back, and a dropped worker's task is rerouted. Click a worker to drop it."
---

## What it is

Running a local model on one machine is easy. Running a handful of them, on machines that differ in speed, memory and network, as if they were a single system is a different problem. LLM Hive is my answer: a hub that turns several Ollama-powered machines into one coordinated inference fleet, managed from a single place.[^1]

I designed the whole stack end to end:[^2] a backend, a web interface, real-time worker telemetry, chat routing, persistent session storage, and a desktop launcher that turns any machine into a worker.

## The hard part: reaching the workers

Most of these machines live on a home or campus network, or behind a tunnel. A hub can't simply connect *to* them. So the connection runs the other way: each worker polls the hub outbound, asks for work and reports back.[^3] Workers only ever make outgoing requests, and the hub still sees every worker's state, which keeps the control plane both visible and fault tolerant.

That one decision is what lets heterogeneous local models, spread across a LAN or tunnelled environments, still act like a fleet.

## Workflows that survive losing a node

Real tasks have more than one step, so the hub runs them as a graph: a DAG-based execution engine with dependency resolution.[^4] Progress is checkpointed, so when a worker disappears mid-workflow the hub can replan from the last checkpoint instead of starting over, apply a failure policy, and reroute the work to a worker that is still alive. Losing a node becomes a detour rather than a failure.

Try it in the figure above: click a worker to drop it and watch its task find a new home.

[^1]: Ollama is a tool for running open language models locally. Each worker in the fleet runs its own.

[^2]: Stack: FastAPI, React and TypeScript, WebSockets, SQLite.

[^3]: Outbound polling means a worker asks "anything for me?" on a timer. The hub never needs a route into the worker's network.

[^4]: A directed acyclic graph: steps with dependencies and no cycles, so there is always a valid order to run them in.
