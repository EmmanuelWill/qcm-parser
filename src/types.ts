// types.ts
export interface Answer {
  text: string;
  correct: boolean;
}

export interface Question {
  title: string;
  answers: Answer[];
  multipleAnswers: boolean;     // true si plusieurs réponses correctes détectées
}

export interface ParseOptions {
  /**
   * Si `true`, ne permet qu'une seule réponse correcte par question.
   * Lancer une erreur si plusieurs `[x]` détectées.
   */
  enforceSingle?: boolean;
}