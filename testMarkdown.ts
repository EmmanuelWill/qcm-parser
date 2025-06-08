import { jsonToMarkdown } from './src/index';
import type { QCM } from './src/types'; // adapte les chemins à ton projet

const sampleQCM: QCM = {
  title: 'General Knowledge Assessment',
  questions: [
    {
      title: 'What is the output of `typeof null`?',
      score: 2,
      multipleAnswers: false,
      answers: [
        { text: '"object"', correct: true },
        { text: '"null"', correct: false },
      ],
    },
    {
      title: 'Which are primitive types?',
      score: 1,
      multipleAnswers: true,
      answers: [
        { text: 'string', correct: true },
        { text: 'number', correct: true },
        { text: 'boolean', correct: true },
        { text: 'object', correct: false },
      ],
    },
  ],
};

const markdown = jsonToMarkdown(sampleQCM);
console.log(markdown);
