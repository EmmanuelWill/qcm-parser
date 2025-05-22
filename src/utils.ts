import { Question, ParseOptions } from './types';

export function finalizeQuestions(
  questions: Question[],
  options: ParseOptions = {}
): Question[] {
  return questions.map((q, idx) => {
    const correctCount = q.answers.filter(a => a.correct).length;

    if (options.requireAtLeastOneCorrect && correctCount === 0) {
      throw new Error(
        `Question #${idx + 1} "${q.title}" has no correct answer (requireAtLeastOneCorrect).`
      );
    }

    if (options.enforceSingle && correctCount > 1) {
      throw new Error(
        `Question #${idx + 1} "${q.title}" has ${correctCount} correct answers (enforceSingle).`
      );
    }

    return {
      ...q,
      multipleAnswers: correctCount > 1
    };
  });
}
