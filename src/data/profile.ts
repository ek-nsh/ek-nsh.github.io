// Identity, About, the desk and the recruiter tour.
// Projects live in src/content/work, writing in src/content/writing, and the longer
// stories in trajectory.ts and research.ts. Facts come from the resume; the wording is
// mine, so edit it freely.

export interface TourStep {
  /** CSS selector of the element to highlight. */
  target: string;
  title: string;
  text: string;
  /** Seconds before auto-advancing (0 = wait for the visitor). */
  seconds: number;
  /** Use a dark veil (for the dark finale). */
  dark?: boolean;
}

export interface ShelfItem {
  title: string;
  take: string;
  href?: string;
  /** An empty slot: the shelf has room for the next read. */
  empty?: boolean;
}

export const profile = {
  /** Shown huge in the hero. */
  name: 'Ekansh',
  /** Used in titles, bylines and the footer. */
  fullName: 'Ekansh Nangia',
  tagline: 'Builder · Researcher · Stargazer',
  intro: [
    'I study CS (AI/ML) at VIT Chennai. I build ',
    { hl: 'distributed systems' },
    ' and ',
    { hl: 'AI tools' },
    ', research how software changes, and write about how models work. Physics, space and chess keep me up late.',
  ] as const,
  about: [
    "I'm a B.Tech CSE (AI/ML) student at VIT Chennai who likes building systems end to end: a fleet of local LLMs that behaves like one machine, a financial simulator that can explain every number, an Android app that found users in Mexico and Azerbaijan in its first month.",
    'A thread runs through all of it: I like systems that show their work. Outside the editor I research how code changes together, write about how language models think, play chess, and look up.',
  ],
  status: { open: true, text: 'Open to opportunities' },
  interests: ['AI & ML systems', 'Mechanistic interpretability', 'Space & physics', 'Chess', 'Philosophy'],
  email: 'ekansh.nangia@gmail.com',
  /** Shown in the footer as "My time", with the offset from the visitor's clock. */
  timezone: { zone: 'Asia/Kolkata', label: 'IST' },
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ekansh-nangia-08170aa1' },
    { label: 'Email', href: 'mailto:ekansh.nangia@gmail.com' },
  ],

  /** Things on the desk: small objects with their own behaviour. See /lab. */
  desk: {
    chessCaption: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#',
    /** Keys are padded to nine characters in the terminal. */
    now: [
      ['building', 'a causal engine for SaaS founders'],
      ['research', 'which files change together'],
      ['writing', 'notes on interpretability'],
      ['studying', 'CSE (AI/ML) at VIT Chennai'],
    ] as [string, string][],
    shelf: [
      {
        title: 'How to become a mech interp researcher',
        take: 'The post whose margin-note style this blog borrows.',
        href: 'https://www.alignmentforum.org/posts/jP9KDyMkchuv6tHwm/how-to-become-a-mechanistic-interpretability-researcher',
      },
      { title: '', take: 'Room for the next read.', empty: true },
      { title: '', take: 'Room for the next read.', empty: true },
      { title: '', take: 'Room for the next read.', empty: true },
      { title: '', take: 'Room for the next read.', empty: true },
    ] as ShelfItem[],
    /** Chess milestones from school. The rating stays private. */
    chessMilestones: [
      ['Inter-House', '2nd place, team event (Grade 11)'],
      ['Thane District', '5th at the district-level selection event'],
      ['Inter-DPS Nationals', 'Team ranked 28 of 80, schools from across the country'],
    ] as [string, string][],
  },

  /** The guided "Recruiter mode" tour. Curate these. */
  tour: [
    {
      target: '[data-tour="intro"]',
      title: 'Who I am',
      text: 'A CS student at VIT Chennai who builds distributed systems and AI tools, and writes about how models work.',
      seconds: 7,
    },
    {
      target: '[data-tour="trajectory"]',
      title: 'How I got here',
      text: 'From school olympiads to lectures at VIT: the path so far, ending at what I am building now.',
      seconds: 7,
    },
    {
      target: '[data-tour="work"]',
      title: 'Selected work',
      text: 'Four builds, from a fleet of local LLMs to a causal engine for founders. Hover a title, then open one for the full story.',
      seconds: 8,
    },
    {
      target: '[data-tour="research"]',
      title: 'Research',
      text: 'A pipeline that predicts which files change together, with an evaluation designed so the future cannot leak in.',
      seconds: 7,
    },
    {
      target: '[data-tour="writing"]',
      title: 'How I think',
      text: 'Long-form writing with a margin outline and equations. The best way to see how I reason.',
      seconds: 7,
    },
    {
      target: '[data-tour="contact"]',
      title: "Let's talk",
      text: 'That is the tour. Reach out, or keep exploring on your own.',
      seconds: 0,
      dark: true,
    },
  ] as TourStep[],
};
