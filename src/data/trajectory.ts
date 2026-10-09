// The flight path: moments that moved me, plus the record behind them (education, crews, lectures).
// From the resume; the wording is mine.

import type { SpriteName } from '../lib/sprites';

export interface Stage {
  id: string;
  when: string;
  title: string;
  text: string;
  sprite: SpriteName;
  /** Shown on the home page's short path (five of them). */
  home?: boolean;
  now?: boolean;
}

export const lead = 'A few things that moved me. Less a résumé, more a flight path.';

export const stages: Stage[] = [
  {
    id: 'olympiads',
    when: 'Grades 2–10',
    title: 'The olympiad years',
    sprite: 'medal',
    text: 'Medals in the International Mathematics, National Science and International English Olympiads, and a National Cyber Olympiad medal every single year from Grade 2 to Grade 10.',
    home: true,
  },
  {
    id: 'school',
    when: 'School years',
    title: 'Representing DPS Nerul',
    sprite: 'flag',
    text: 'The Inter-DPS quiz competition in Grade 9, a CTF hackathon, and an AI chatbot competition where I built a working chatbot with bag-of-words NLP and TensorFlow.',
    home: true,
  },
  {
    id: 'idea',
    when: 'Grade 11',
    title: 'A phone-security idea',
    sprite: 'shield',
    text: 'Second place in the inter-house innovation competition for an all-in-one phone security app: antivirus, fraudulent-number detection, AI live-call flagging and link verification.',
  },
  {
    id: 'vit',
    when: '2025',
    title: 'VIT Chennai',
    sprite: 'cap',
    text: 'Started the B.Tech in CSE (AI/ML) and joined the research, open-source and security clubs on campus.',
    home: true,
  },
  {
    id: 'lectures',
    when: 'At VIT',
    title: 'Teaching what I learn',
    sprite: 'screen',
    text: 'A two-hour lecture on how modern generative AI works, for 50+ students including guests from other institutions, and a hands-on Linux lecture at TechnoVIT.',
    home: true,
  },
  {
    id: 'now',
    when: 'Now',
    title: 'Currently',
    sprite: 'star',
    text: 'Building a causal simulator for SaaS founders, researching co-change prediction in Python repositories, and writing about interpretability.',
    home: true,
    now: true,
  },
];

export const education = [
  { place: 'VIT Chennai', what: 'B.Tech, Computer Science & Engineering (AI/ML)', when: '2025 – 2029', note: 'CGPA 8.6 after Semester 1' },
  { place: 'DPS Nerul', what: 'CBSE, Class XII', when: '2025', note: '' },
  { place: 'DPS Nerul', what: 'CBSE, Class X', when: '2023', note: '' },
];

export const crews = [
  { role: 'AI/ML Researcher & Developer', where: 'Open Source Programming Club (OSPC), VITC', when: 'Sep 2025 – now', text: 'AI and ML research projects and open-source development.' },
  { role: 'AI/ML Researcher & Developer', where: 'Bionary Club, VITC', when: 'Aug 2025 – now', text: 'R&D on artificial neural networks and applied machine learning problems.' },
  { role: 'Research & Development Specialist', where: 'Technical Researchers Club, VIT Chennai', when: 'Aug 2025 – now', text: 'Analytical research and creative problem-solving in applied computing.' },
  { role: 'Cybersecurity Specialist', where: 'Microsoft Innovations Club, VITC', when: 'Oct 2025 – now', text: '' },
  { role: 'Technical Team Member', where: 'IEEE Computer Society, VITC', when: 'Oct 2025 – now', text: '' },
  { role: 'Competitive Programmer', where: 'CodeChef VIT-Chennai Chapter', when: 'Oct 2025 – now', text: '' },
];

export const talks = [
  {
    title: 'Generative AI: Under the Hood',
    where: 'VIT Chennai',
    text: 'A two-hour technical lecture on the inner workings of modern generative AI systems, for 50+ students including attendees from external institutions.',
  },
  {
    title: 'Linux Fundamentals',
    where: "TechnoVIT, VIT Chennai's annual technical fest",
    text: 'A hands-on lecture introducing students from colleges across India to core Linux concepts and command-line workflows.',
  },
];
