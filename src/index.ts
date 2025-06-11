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
          `Question #${idx + 1}, Réponse #${aidx + 1}  est malformatée: expected { text: string, correct: boolean | null }`
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

/**
 * Converts a QCM object into a Markdown string.
 *
 * @param qcm - The QCM object with optional global title and array of questions.
 * @returns A Markdown-formatted string:
 *   - Optional top-level title: `# <title>`
 *   - Each question: `## Q: <title> [score]`
 *   - Each answer: `- [x] <text>` or `- [ ] <text>`
 */
export function jsonToMd(qcm: QCM): string {
  const lines: string[] = [];

  // Global title
  if (qcm.title) {
    lines.push(`# Title: ${qcm.title.trim()}`);
    lines.push('');
  }

  // Questions
  qcm.questions.forEach((question: Question) => {
    // Header with optional score
    let header = `## Q: ${question.title.trim()}`;
    if (typeof question.score === 'number') {
      header += ` [${question.score}]`;
    }
    lines.push(header);

    // Answers
    question.answers.forEach((ans: Answer) => {
      const mark = ans.correct ? '[x]' : '[ ]';
      lines.push(`- ${mark} ${ans.text.trim()}`);
    });

    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Generates the Markdown text from the QCM object and
 * immediately triggers a browser download of the `.md` file.
 *
 * The filename defaults to `<QCM title>.md` (sanitized), or `qcm.md` if no title.
 *
 * @param qcm - The QCM object to export.
 */
export function downloadMd(qcm: QCM): void {
  // 1. Generate the markdown
  const md = jsonToMd(qcm);

  // 2. Determine filename from QCM title (fallback to 'qcm')
  const base = qcm.title
    ? qcm.title
        .trim()
        // remove illegal filename characters
        .replace(/[\/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '_')
    : 'qcm';
  const filename = `${base}.md`;

  // 3. Create a Blob and object URL
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  // 4. Create a temporary anchor and trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // 5. Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
