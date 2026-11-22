import fs from "node:fs";
import { z } from "zod";
import { ProjectSchema } from "../packages/project-schema";
fs.mkdirSync("public/schema", { recursive: true });
fs.writeFileSync(
  "public/schema/project-v1.json",
  JSON.stringify(z.toJSONSchema(ProjectSchema, { io: "input" }), null, 2) +
    "\n",
);
console.log(
  "Canonical project schema exported to public/schema/project-v1.json.",
);
