import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  addCalendarMonths,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  startOfWeek,
  taskCoversDay,
  tasksOfDay,
  weekDays,
} from "./siteCalendar";

const date = (year: number, monthIndex: number, day: number, hours = 0) =>
  new Date(year, monthIndex, day, hours, 0, 0, 0).getTime();

describe("siteCalendar — repères de dates", () => {
  it("startOfDay ramène à minuit local", () => {
    const noon = date(2026, 10, 3, 13);
    const midnight = new Date(startOfDay(noon));
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getDate()).toBe(3);
  });

  it("startOfWeek renvoie toujours un lundi, y compris depuis un dimanche", () => {
    const sunday = date(2026, 10, 1); // 1er novembre 2026
    const monday = startOfWeek(sunday);
    expect(new Date(monday).getDay()).toBe(1);
    expect(monday).toBeLessThanOrEqual(startOfDay(sunday));
    expect(addCalendarDays(monday, 7)).toBeGreaterThan(startOfDay(sunday));
  });

  it("weekDays renvoie 7 journées consécutives commençant un lundi", () => {
    const days = weekDays(date(2026, 10, 4));
    expect(days).toHaveLength(7);
    expect(new Date(days[0]).getDay()).toBe(1);
    expect(new Date(days[6]).getDay()).toBe(0); // dimanche
    expect(days[2] - days[0]).toBe(2 * 86_400_000);
  });

  it("monthGrid couvre 6 semaines complètes alignées sur lundi", () => {
    const grid = monthGrid(date(2026, 10, 15));
    expect(grid).toHaveLength(42);
    expect(new Date(grid[0]).getDay()).toBe(1);
    expect(isSameMonth(grid[0], date(2026, 10, 15))).toBe(false);
    expect(grid.some((day) => isSameMonth(day, date(2026, 10, 15)))).toBe(true);
    expect(grid.filter((day) => isSameMonth(day, date(2026, 10, 15)))).toHaveLength(30);
  });

  it("addCalendarMonths passe correctement d'une année à l'autre", () => {
    const december = startOfMonth(date(2026, 11, 20));
    expect(isSameMonth(addCalendarMonths(december, 1), date(2027, 0, 1))).toBe(true);
    expect(isSameMonth(addCalendarMonths(december, -12), date(2025, 11, 1))).toBe(true);
  });

  it("isSameDay ignore l'heure, isSameMonth ignore le jour", () => {
    expect(isSameDay(date(2026, 10, 2, 3), date(2026, 10, 2, 23))).toBe(true);
    expect(isSameDay(date(2026, 10, 2), date(2026, 10, 3))).toBe(false);
    expect(isSameMonth(date(2026, 10, 2), date(2026, 10, 28))).toBe(true);
    expect(isSameMonth(date(2026, 10, 2), date(2026, 11, 2))).toBe(false);
  });
});

describe("siteCalendar — phases par journée", () => {
  const task = (startDate: number, endDate: number) => ({ startDate, endDate });

  it("une phase d'un seul jour apparaît ce jour-là", () => {
    const day = date(2026, 10, 5);
    expect(taskCoversDay(task(day, day), day)).toBe(true);
  });

  it("une phase multi-jours apparaît sur chaque journée couverte", () => {
    const start = date(2026, 10, 5);
    const end = date(2026, 10, 7);
    const range = task(start, end);
    expect(taskCoversDay(range, date(2026, 10, 4))).toBe(false);
    expect(taskCoversDay(range, date(2026, 10, 5))).toBe(true);
    expect(taskCoversDay(range, date(2026, 10, 6))).toBe(true);
    expect(taskCoversDay(range, date(2026, 10, 7))).toBe(true);
    expect(taskCoversDay(range, date(2026, 10, 8))).toBe(false);
  });

  it("tasksOfDay filtre et trie par date de démarrage", () => {
    const day = date(2026, 10, 10);
    const late = { _id: "b", startDate: date(2026, 10, 9), endDate: date(2026, 10, 12) };
    const early = { _id: "a", startDate: date(2026, 10, 1), endDate: date(2026, 10, 10) };
    const outside = { _id: "c", startDate: date(2026, 10, 20), endDate: date(2026, 10, 22) };

    expect(tasksOfDay([late, early, outside], day).map((row) => row._id)).toEqual(["a", "b"]);
  });

  it("une phase hors de la journée n'est jamais retenue", () => {
    const day = date(2026, 10, 10);
    expect(tasksOfDay([task(date(2026, 11, 1), date(2026, 11, 3))], day)).toHaveLength(0);
  });
});
