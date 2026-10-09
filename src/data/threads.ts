// Ideas that run through several projects. They link stars on the Work chart.
// Not tech stacks: the things I keep reaching for.

export type Thread = 'graphs' | 'decisions' | 'shows-work';

export const threads: { id: Thread; label: string; text: string }[] = [
  { id: 'graphs', label: 'Everything is a graph', text: 'DAGs, financial nodes, co-change graphs, shortest paths.' },
  { id: 'decisions', label: 'Decisions, not just predictions', text: 'Replanning, what-if simulation, uncertainty-aware scoring.' },
  { id: 'shows-work', label: 'Shows its work', text: 'Telemetry, audit logs, energy maths, leak-proof evaluation.' },
];
