// Mesure d'une commande : pic de RSS (VmHWM) sur tout l'arbre de processus,
// durée et code de sortie. Le shell lance ce script en avant-plan ; le processus
// mesuré est un ENFANT de Node (rien n'est mis en arrière-plan par le shell).
import { spawn } from "node:child_process";
import fs from "node:fs";

const [label, ...cmd] = process.argv.slice(2);
const started = Date.now();

const child = spawn(cmd[0], cmd.slice(1), {
  stdio: ["ignore", "pipe", "pipe"],
  cwd: process.cwd(),
});

let out = "";
child.stdout.on("data", (d) => (out += d.toString()));
child.stderr.on("data", (d) => (out += d.toString()));

const tree = (pid) => {
  const res = [String(pid)];
  const walk = (p) => {
    let kids = "";
    try {
      kids = fs.readFileSync(`/proc/${p}/task/${p}/children`, "utf8").trim();
    } catch {
      return;
    }
    for (const k of kids.split(/\s+/).filter(Boolean)) {
      res.push(k);
      walk(k);
    }
  };
  walk(String(pid));
  return res;
};

let peakKb = 0;
const sample = () => {
  for (const p of tree(child.pid)) {
    try {
      const m = fs.readFileSync(`/proc/${p}/status`, "utf8").match(/VmHWM:\s+(\d+) kB/);
      if (m && Number(m[1]) > peakKb) peakKb = Number(m[1]);
    } catch {
      /* le processus a déjà terminé */
    }
  }
};

const timer = setInterval(sample, 200);

const finish = (code, signal) => {
  clearInterval(timer);
  sample();
  const cgroup = Number(fs.readFileSync("/sys/fs/cgroup/memory.current", "utf8"));
  const peak = Number(
    (fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8") || "0").trim() || 0,
  );
  console.log(
    JSON.stringify({
      commande: label,
      exit: code,
      signal,
      picProcessusMo: Math.round(peakKb / 1024),
      dureeS: Math.round((Date.now() - started) / 1000),
      cgroupMo: Math.round(cgroup / 1048576),
      cgroupPicGlobalMo: Math.round(peak / 1048576),
    }),
  );
  if (out.trim()) console.log(out.trim().slice(0, 6000));
  process.exit(code ?? 1);
};

child.on("error", (e) => {
  clearInterval(timer);
  console.log(JSON.stringify({ commande: label, erreur: String(e) }));
  process.exit(127);
});
child.on("exit", (code, signal) => finish(code, signal));
