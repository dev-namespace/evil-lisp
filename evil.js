const { createEnvironment, defineVariable } = require("./environment");
const primitives = require("./primitives");
const { parse } = require("./parser");
const { evaluate } = require("./evaluator");
const { repl } = require("./repl");
const { read, InputStream } = require("./reader");
const { hideBin } = require("yargs/helpers");
const { createCompilationEnvironment } = require("./compiler");
const yargs = require("yargs/yargs");
const fs = require("fs");

process.argv = yargs(hideBin(process.argv)).argv;
const sourceFile = process.argv._[0];
const debugMode = process.argv.debug;
const compiledEval = process.argv.compiledEval;
const env = createCompilationEnvironment();

if(sourceFile) {
  compileFile(sourceFile)
} else {
  repl(env);
}

function compileFile(sourceFile) {
  let content = fs.readFileSync(sourceFile).toString();
  content = content.replace(/;.*/g, "");
  content = content.replace(/\r\n/g, " ");
  content = content.replace(/\n/g, " ");
  const input = `(progn ${content})`;
  const ast = parse(read(InputStream(input)), env);

  if (compiledEval) {
    const compilation = createCompilationPrefix() + compile(ast, env);
    eval(`(function(){${compilation}}())`);
  } else {
    evaluate(ast, env);
  }
}
