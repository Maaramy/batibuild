import { describe, expect, it } from "vitest";

import {
  doneTaskIds,
  executionPhaseStatus,
  executionTaskStatus,
  taskDueDate,
  type ExecutionTaskStatus,
} from "./projectGuideStatus";

const DAY = 24 * 60 * 60 * 1000;
const today = 1_900_000_000_000;

const task = (over: Partial<Parameters<typeof executionTaskStatus>[0]> = {}) => ({
  id: "t1",
  status: "todo" as const,
  progress: 0,
  endDay: 10,
  dependencies: [] as string[],
  ...over,
});

describe("executionTaskStatus", () => {
  it("renvoie « terminé » dès que la tâche est cochée ou à 100 %", () => {
    expect(executionTaskStatus(task({ status: "done" }), { today })).toBe("done");
    expect(executionTaskStatus(task({ progress: 100 }), { today })).toBe("done");
  });

  it("distingue en cours et en retard selon l'échéance réelle", () => {
    expect(executionTaskStatus(task({ status: "in_progress", progress: 40 }), { today })).toBe(
      "in_progress",
    );
    // Échéance = démarrage + 10 jours, déjà dépassée.
    expect(
      executionTaskStatus(task({ status: "in_progress", progress: 40 }), {
        today,
        startDate: today - 20 * DAY,
      }),
    ).toBe("late");
  });

  it("signale une tâche non démarrée dont l'échéance est passée", () => {
    expect(executionTaskStatus(task(), { today, startDate: today - 30 * DAY })).toBe("late");
  });

  it("met en attente une tâche dont une dépendance n'est pas terminée", () => {
    const withDep = task({ dependencies: ["prev"] });
    expect(executionTaskStatus(withDep, { today, doneTaskIds: new Set() })).toBe("waiting");
    expect(executionTaskStatus(withDep, { today, doneTaskIds: new Set(["prev"]) })).toBe("todo");
  });

  it("calcule la date d'échéance depuis le démarrage estimé", () => {
    expect(taskDueDate(today, { endDay: 14 })).toBe(today + 14 * DAY);
    expect(taskDueDate(undefined, { endDay: 14 })).toBeUndefined();
  });
});

describe("executionPhaseStatus", () => {
  const statuses = (list: ExecutionTaskStatus[]) => executionPhaseStatus(list);

  it("termine la phase quand toutes les tâches le sont", () => {
    expect(statuses(["done", "done"])).toBe("done");
  });

  it("priorise le retard, puis l'avancement, puis l'attente", () => {
    expect(statuses(["done", "late"])).toBe("late");
    expect(statuses(["done", "in_progress"])).toBe("in_progress");
    expect(statuses(["waiting", "todo"])).toBe("waiting");
    expect(statuses(["todo"])).toBe("todo");
    expect(statuses([])).toBe("todo");
  });

  it("collecte les identifiants des tâches terminées", () => {
    expect(
      [...doneTaskIds([
        { id: "a", status: "done", progress: 100 },
        { id: "b", status: "in_progress", progress: 100 },
        { id: "c", status: "todo", progress: 0 },
      ])],
    ).toEqual(["a", "b"]);
  });
});
