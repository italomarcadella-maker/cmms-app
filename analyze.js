const { ESLint } = require("eslint");
const fs = require("fs");

(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["."]);
  const errorResults = results.filter(r => r.errorCount > 0);
  
  errorResults.sort((a, b) => b.errorCount - a.errorCount);
  
  let out = "";
  for (const r of errorResults) {
    const errs = r.messages.filter(m => m.severity === 2);
    out += `${r.filePath} - ${r.errorCount} Errors\n`;
    for (const err of errs) {
       out += `  Line ${err.line}: ${err.message} (${err.ruleId || 'syntax'})\n`;
    }
  }
  fs.writeFileSync("eslint_summary.txt", out);
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
