// Research page content. From the resume; please correct anything I over-read.

export const research = {
  lede: 'I like questions where how you evaluate matters as much as what you build.',
  study: {
    title: 'Change Impact Analysis',
    subtitle: 'A research pipeline for co-change prediction in Python open-source repositories',
    status: 'In progress',
    question: 'When someone edits one file, which other files will probably change in the same commit?',
    intro: [
      'Every large codebase hides a second structure beside its imports: the files that keep changing together. Knowing it early tells a developer what to check, test or review before a change lands.',
      "I'm building a research and evaluation pipeline for exactly this: current-file impact prediction across Python open-source repositories, with a benchmark designed so that no method gets to peek at the future.",
    ],
    figure: 'Illustration: commits stream in, the wall marks "now", and each method may only learn from what is on its left. Click anywhere to move the wall.',
    methods: [
      ['Co-change', 'Files that changed together before tend to change together again.'],
      ['Graph propagation', "Spread a change's impact along a graph built from the repository's history."],
      ['Hierarchical learning', 'A learned ranker with a hierarchical structure.'],
      ['Support-aware hybrid', 'Blends the methods, taking into account how much historical evidence backs each prediction.'],
    ] as [string, string][],
    pipeline: [
      ['Mine', 'Data mining and reproducible, commit-level datasets.'],
      ['Connect', 'Graph construction and co-change analysis.'],
      ['Rank', 'Learned ranking of candidate files, compared under one experimental framework.'],
      ['Judge', 'Leak-proof evaluation protocols and statistical comparison pipelines.'],
    ] as [string, string][],
    evaluation: [
      ['Rolling-origin', 'Temporal benchmarking: train on the past, test on what comes next, then roll forward.'],
      ['Leak-proof', 'Nothing from the future may influence a prediction. The protocol is built to make that checkable.'],
      ['Support-stratified', 'Results are broken down at the level of individual change events, by how much evidence existed.'],
    ] as [string, string][],
  },
  where: [
    { who: 'AI/ML Researcher & Developer', at: 'Open Source Programming Club, VITC', when: 'Sep 2025 – now' },
    { who: 'AI/ML Researcher & Developer', at: 'Bionary Club, VITC', when: 'Aug 2025 – now' },
    { who: 'Research & Development Specialist', at: 'Technical Researchers Club, VIT Chennai', when: 'Aug 2025 – now' },
  ],
};
