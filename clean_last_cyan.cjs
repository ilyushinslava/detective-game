const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src", "components", "MainMenu.tsx");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'EvidenceCards: ({ className = "w-6 h-6 text-cyan-400"',
  'EvidenceCards: ({ className = "w-6 h-6 text-amber-400"'
);

content = content.replace(
  'text-cyan-400 hover:text-cyan-300 uppercase tracking-widest px-3 py-1.5 bg-cyan-950/50 rounded border border-cyan-900/50',
  'text-amber-400 hover:text-amber-300 uppercase tracking-widest px-3 py-1.5 bg-amber-950/50 rounded border border-amber-900/50'
);

fs.writeFileSync(file, content, "utf8");
console.log("MainMenu.tsx полностью очищен.");