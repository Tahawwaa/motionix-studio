import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const tokenHeaders: Record<string, string> = process.env.NOVA_API_TOKEN
  ? { Authorization: `Bearer ${process.env.NOVA_API_TOKEN}` }
  : {};
const production = process.argv.includes("--production");
const children: ChildProcess[] = [];
fs.mkdirSync(".nova", { recursive: true });
const pidfile = path.join(root, ".nova/processes.json");
const processes: { pid: number; command: string; startedAt: string }[] = [];
async function reachable(url: string) {
  try {
    return (
      await fetch(url, {
        signal: AbortSignal.timeout(1500),
        headers: url.includes(":5173") ? {} : tokenHeaders,
      })
    ).ok;
  } catch {
    return false;
  }
}
function launch(command: string, args: string[], cwd = root) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, NOVA_PROJECT_ROOT: root },
    shell: false,
  });
  children.push(child);
  if (child.pid) {
    processes.push({
      pid: child.pid,
      command: command + " " + args.join(" "),
      startedAt: new Date().toISOString(),
    });
    fs.writeFileSync(pidfile, JSON.stringify(processes));
  }
  child.on("error", (e) => {
    console.error(`Unable to start ${command}: ${e.message}`);
    shutdown(1);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) shutdown(code);
  });
  return child;
}
async function ready(url: string, label: string) {
  for (let i = 0; i < 120; i++) {
    if (await reachable(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `${label} did not become ready. Check the service output above.`,
  );
}
let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  fs.rmSync(pidfile, { force: true });
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
try {
  if (production && !fs.existsSync("dist/index.html"))
    throw new Error("Run npm run build before npm start.");
  if (
    !fs.existsSync("apps/backend/vendor/autoload.php") ||
    !fs.existsSync("apps/backend/.env")
  )
    throw new Error("Run npm run setup first to prepare Laravel and SQLite.");
  if (!(await reachable("http://127.0.0.1:8001/worker/health"))) {
    launch(process.execPath, [
      "--import",
      "tsx",
      "services/render-worker/server.ts",
    ]);
    await ready("http://127.0.0.1:8001/worker/health", "Render worker");
  } else console.log("Using the running local render worker.");
  if (!(await reachable("http://127.0.0.1:8000/api/health"))) {
    launch(
      "php",
      [
        "-d",
        "upload_max_filesize=100M",
        "-d",
        "post_max_size=105M",
        "-S",
        "127.0.0.1:8000",
        "-t",
        "public",
        "public/index.php",
      ],
      path.join(root, "apps/backend"),
    );
    await ready("http://127.0.0.1:8000/api/health", "Laravel backend");
  } else console.log("Using the running local Laravel backend.");
  if (!(await reachable("http://127.0.0.1:5173"))) {
    launch(process.execPath, [
      "node_modules/vite/bin/vite.js",
      ...(production ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      "--port",
      "5173",
      "--strictPort",
    ]);
    await ready("http://127.0.0.1:5173", "Studio");
  } else console.log("Using the running local Studio.");
  console.log(
    "\nNOVA Motion Studio is ready: http://127.0.0.1:5173\nAll services bind to localhost. Press Ctrl+C to stop services launched here.",
  );
  if (!children.length) process.exit(0);
} catch (e) {
  console.error((e as Error).message);
  shutdown(1);
}
