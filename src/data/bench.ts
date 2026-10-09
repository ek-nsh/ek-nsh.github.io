// The smaller bodies on the Work chart: course work and school experiments. No pages of their own.

import type { SpriteName } from '../lib/sprites';
import type { Thread } from './threads';

export interface Minor {
  id: string;
  title: string;
  text: string;
  sprite: SpriteName;
  /** Position on the chart, in percent. */
  pos: [number, number];
  threads: Thread[];
}

export const bench: Minor[] = [
  {
    id: 'dsa',
    title: 'Data structures from scratch',
    text: "Linked lists, BSTs, AVL and red-black trees in C/C++, plus Dijkstra, Kruskal's and Prim's, Huffman coding, graph colouring and LCS, each checked against correctness tests.",
    sprite: 'tree',
    pos: [11, 72],
    threads: ['graphs'],
  },
  {
    id: 'embedded',
    title: 'Arduino environmental monitor',
    text: 'An Arduino UNO system with soil-moisture sensing, servo control, an IR sensor and an ultrasonic sensor for real-time monitoring, built alongside shift registers and counters from JK and D flip-flops.',
    sprite: 'chip',
    pos: [30, 85],
    threads: [],
  },
  {
    id: 'chatbot',
    title: 'School chatbot',
    text: 'A working chatbot using bag-of-words NLP and TensorFlow, built for the Inter-DPS AI chatbot competition.',
    sprite: 'bubble',
    pos: [59, 11],
    threads: [],
  },
  {
    id: 'phone',
    title: 'Phone-security concept',
    text: 'An all-in-one phone security app idea (antivirus, fraudulent-number detection, AI call flagging, link verification) that won second place in the Grade 11 innovation competition.',
    sprite: 'shield',
    pos: [90, 54],
    threads: [],
  },
];
