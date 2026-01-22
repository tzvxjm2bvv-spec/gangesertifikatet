export type Task = {
  a: number;
  b: number;
  text: string;
  answer: number;
};

export type TaskResult = {
  task: Task;
  userAnswer: number | null;
  correct: boolean;
  ms: number;
  ts: number;
};

export function makeTask(
  tables: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10],
  maxB: number = 12
): Task {
  const a = tables[Math.floor(Math.random() * tables.length)];
  const b = Math.floor(Math.random() * maxB) + 1;

  return {
    a,
    b,
    text: `${a} × ${b}`,
    answer: a * b,
  };
}
