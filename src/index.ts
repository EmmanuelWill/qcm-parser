import { QCM, RawArrayQ, Question, Answer, ParseOptions } from './types';
import { finalizeQuestions } from './utils';

/**
 * Parses a Markdown string into a QCM object.
 *
 * Supported syntax:
 * - Global title (optional): a line starting with `# Title:` or `# QCM:`
 * - Question header: `## Q: <text> [n]` where `[n]` (optional) is the point value
 * - Answer line: `- [ ] <text>` or `- [x] <text>`
 * - Blank lines are ignored
 * 
 * @param markdown - The raw Markdown text to parse
 * @param options   - Parsing options (enforceSingle, requireAtLeastOneCorrect)
 * @returns A QCM object with `title?` and an array of validated questions
 *
 * @throws Error on any format inconsistency:
 *   - answer without a preceding question
 *   - unrecognized line syntax
 *   - question without answers
 *   - too many / too few correct answers when options demand it
 */
export function parseQCM(
  markdown: string,
  options: ParseOptions = {}
): QCM {
  const lines = markdown.split(/\r?\n/);
  const qcm: QCM = { questions: [] };
  let currentQuestion: Question | null = null;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // 1. Global QCM title
    if (!qcm.title && /^#\s*(?:Title|QCM):/i.test(line)) {
      qcm.title = line.replace(/^#\s*(?:Title|QCM):/i, '').trim();
      return;
    }

    // 2. Question header
    const questionMatch = line.match(/^##\s*Q:\s*(.+)$/);
    if (questionMatch) {
      // close previous question
      if (currentQuestion) {
        qcm.questions.push(currentQuestion);
      }

      let text = questionMatch[1].trim();
      let score = 1;
      // extract "[n]" at end for point value
      const scoreMatch = text.match(/\[(\d+)\]\s*$/);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
        text = text.replace(/\[\d+\]\s*$/, '').trim();
      }

      currentQuestion = {
        title: text,
        score,
        answers: [],
        multipleAnswers: false,
      };
      return;
    }

    // 3. Answer line
    const answerMatch = line.match(/^- \[([ xX])\]\s*(.+)$/);
    if (answerMatch) {
      if (!currentQuestion) {
        throw new Error(
          `Ligne ${idx + 1}: réponse trouvée sans question au préalable: "${rawLine}"`
        );
      }
      const correct = answerMatch[1].toLowerCase() === 'x';
      const text = answerMatch[2].trim();
      currentQuestion.answers.push({ text, correct });
      return;
    }

    // 4. Blank or comment (`<!-- ... -->`) lines
    if (line === '' || line.startsWith('<!--')) {
      return;
    }

    // 5. Unrecognized syntax
    throw new Error(
      `Ligne ${idx + 1}: syntaxe non reconnue, respectez le formatage indiqué dans le fichier exemple: "${rawLine}"`
    );
  });

  // close last question
  if (currentQuestion) {
    qcm.questions.push(currentQuestion);
  }

  // Ensure every question has at least one answer
  qcm.questions.forEach((q, i) => {
    if (q.answers.length === 0) {
      throw new Error(
        `Question #${i + 1} "${q.title}" sans réponse.`
      );
    }
  });

  // 6. Finalize: detect multipleAnswers and apply enforceSingle / requireAtLeastOneCorrect
  qcm.questions = finalizeQuestions(qcm.questions, options);

  return qcm;
}

/**
 * Parse a raw question array into a QCM, extracting [n] points from titles.
 *
 * @param rawArr  Array of questions with `title` possibly suffixed by `[n]`
 * @param options enforceSingle, requireAtLeastOneCorrect
 */
export function parseQCMFromArray(
  rawArr: RawArrayQ[],
  options: ParseOptions = {}
): QCM {
  const qcm: QCM = { questions: [] };

  rawArr.forEach((item, idx) => {
    if (typeof item.title !== 'string' || !Array.isArray(item.answers)) {
      throw new Error(`Item #${idx + 1} est mal formaté: expected { title: string, answers: Answer[] }`);
    }

    // Extract score from title if present
    let title = item.title.trim();
    let score = 1;
    const scoreMatch = title.match(/\[(\d+)\]\s*$/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1], 10);
      title = title.replace(/\[\d+\]\s*$/, '').trim();
    }

    // Map answers
    const answers: Answer[] = item.answers.map((ans, aidx) => {
      if (typeof ans.text !== 'string' || (![true, false, null].includes(ans.correct))) {
        throw new Error(
          `Question #${idx + 1}, Réponse #${aidx + 1} malformatée: expected { text: string, correct: boolean | null }`
        );
      }
      // treat null as false
      return {
        text: ans.text.trim(),
        correct: ans.correct === true
      };
    });

    // Push question skeleton
    qcm.questions.push({
      title,
      score,
      answers,
      multipleAnswers: false // calculé ensuite
    });
  });

  // Finalize (detect multipleAnswers, enforce options)
  qcm.questions = finalizeQuestions(qcm.questions, options);
  return qcm;
}