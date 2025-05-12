/*
 qcm-parser v1.1.0
 Ajout du support explicite pour plusieurs bonnes réponses 
 (QCM) et option 'enforceSingle' pour QCU.
*/

// index.ts
import { Question, Answer, ParseOptions } from './types';

/**
 * Parse un texte Markdown/texte brut en questions QCM JSON.
 * Détecte automatiquement si une question possède plusieurs réponses correctes.
 * @param markdown Le contenu Markdown à parser.
 * @param options Options de parsing.
 */
export function parseQCM(
  markdown: string,
  options: ParseOptions = {}
): Question[] {
  const lines = markdown.split(/\r?\n/);
  const questions: Question[] = [];
  let currentQuestion: Question | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## Q:')) {
      // Nouvelle question
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        title: trimmed.substring(5).trim(),
        answers: [],
        multipleAnswers: false,
      };
    } else if (trimmed.startsWith('- [')) {
      // Nouvelle réponse
      if (!currentQuestion) continue;
      const isCorrect = trimmed.charAt(3).toLowerCase() === 'x';
      const answerText = trimmed.substring(6).trim();
      currentQuestion.answers.push({ text: answerText, correct: isCorrect });
    }
  }
  // Ajouter dernière question
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // Post-traitement : détection et validation
  for (const q of questions) {
    const correctCount = q.answers.filter(a => a.correct).length;
    q.multipleAnswers = correctCount > 1;
    if (options.enforceSingle && correctCount > 1) {
      throw new Error(
        `La question "${q.title}" contient ${correctCount} réponses correctes, mais enforceSingle est activé.`
      );
    }
  }

  return questions;
}
