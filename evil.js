const { createEnvironment, defineVariable } = require("./environment");
const primitives = require("./primitives");
const { parse } = require("./parser");
const { evaluate } = require("./evaluator");
const { read, InputStream } = require("./reader");
const { hideBin } = require("yargs/helpers");
const yargs = require("yargs/yargs");
const fs = require("fs");

const argv = yargs(hideBin(process.argv)).argv;

console.log("args:", argv);

const sourceFile = argv._[0];
const debugMode = argv.debug;
const compiledEval = argv.compiledEval;

function createGlobalEnvironment() {
  const env = createEnvironment();
  for (let primitive of primitives) {
    defineVariable(primitive[0], primitive[1], env);
  }
  defineVariable("console", console, env);
  try {
    defineVariable("window", window, env);
  } catch (err) {}

  try {
    defineVariable("global", global, env);
  } catch (err) {}
  return env;
}

let content = fs.readFileSync(sourceFile).toString();
content = content.replace(/;.*/g, "");
content = content.replace(/\r\n/g, " ");
content = content.replace(/\n/g, " ");
const input = `(progn ${content})`;
const env = createGlobalEnvironment();
const ast = parse(read(InputStream(input)), env);

if (compiledEval) {
  const compilation = createCompilationPrefix() + compile(ast, env);
  eval(`(function(){${compilation}}())`);
} else {
  evaluate(ast, env);
}
