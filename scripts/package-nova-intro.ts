import fs from "node:fs";
const directory = "examples/nova-intro";
const project = JSON.parse(
  fs.readFileSync(directory + "/project.json", "utf8"),
);
const response = await fetch(
  `http://127.0.0.1:8000/api/projects/${project.id}/backup`,
  {
    headers: {
      Accept: "application/zip",
      ...(process.env.NOVA_API_TOKEN
        ? { Authorization: `Bearer ${process.env.NOVA_API_TOKEN}` }
        : {}),
    },
  },
);
if (!response.ok) throw new Error(`Backup failed (${response.status})`);
if (!response.headers.get("content-type")?.includes("zip"))
  throw new Error("Expected portable ZIP");
const bytes = Buffer.from(await response.arrayBuffer());
fs.writeFileSync(directory + "/nova-intro-project.zip", bytes);
console.log(
  JSON.stringify({
    project: project.name,
    portableBackup: directory + "/nova-intro-project.zip",
    bytes: bytes.length,
  }),
);
