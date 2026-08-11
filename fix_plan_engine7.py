P = "/home/daytona/codebase/src/convex/planEngine.ts"
src = open(P, encoding="utf-8").read()

old = """  const start = clamp(tPref, margin, maxT);
  const candidates: number[] = [start];
  for (let step = 0.35; step <= len + 0.01; step += 0.35) {
    candidates.push(start + step, start - step);
  }"""
new = """  const start = clamp(tPref, margin, maxT);
  const candidates: number[] = [start];
  for (let step = 0.15; step <= len + 0.01; step += 0.15) {
    candidates.push(start + step, start - step);
  }"""
assert src.count(old) == 1, f"count={src.count(old)}"
src = src.replace(old, new)
open(P, "w", encoding="utf-8").write(src)
print("OK")
