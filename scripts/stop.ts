import fs from "node:fs";
const file = ".nova/processes.json";
if (!fs.existsSync(file)) {
  console.log(
    "No NOVA startup-managed processes found. Stop individually started services in their terminals.",
  );
} else {
  const processes = JSON.parse(fs.readFileSync(file, "utf8")) as {
    pid: number;
    command: string;
  }[];
  for (const p of processes) {
    if (process.platform === "linux") {
      try {
        const command = fs.readFileSync(`/proc/${p.pid}/cmdline`, "utf8");
        if (
          !/services\/render-worker\/server.ts|vite\/bin\/vite.js|public\/index.php/.test(
            command,
          )
        ) {
          console.log(
            `Skipped process ${p.pid}: it no longer matches a NOVA service.`,
          );
          continue;
        }
      } catch {
        continue;
      }
    }
    try {
      process.kill(p.pid, "SIGTERM");
      console.log(`Stopped ${p.command}`);
    } catch {
      /* Already stopped. */
    }
  }
  fs.rmSync(file, { force: true });
}
