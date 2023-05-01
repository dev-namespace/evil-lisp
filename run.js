const { createEnvironment, defineVariable } = require("./environment");
const primitives = require("./primitives");
const { compile, createCompilationPrefix } = require("./compiler");
const { parse } = require("./parser");
const { read, InputStream } = require("./reader");
const fs = require("fs");

const path = process.argv[2];
let content = fs.readFileSync(path).toString();
content = content.replace(/;.*/g, "");
content = content.replace(/\r\n/g, " ");
content = content.replace(/\n/g, " ");
const input = `(progn ${content})`;

//@ TODO createCompilationEnvironment instead
function createGlobalEnvironment() {
  const env = createEnvironment();
  for (let primitive of primitives) {
    defineVariable(primitive[0], primitive[1], env);
  }
  defineVariable("console", console, env);
  return env;
}

console.time("read");
const env = createGlobalEnvironment();
const r = read(InputStream(input));
console.timeEnd("read");
console.time("parse");
const ast = parse(r);
console.timeEnd("parse");
console.time("compile");
const compilation = createCompilationPrefix() + compile(ast, env);
console.timeEnd("compile");
console.log("\nCOMPILATION OUTPUT");
console.log("=================================");
console.log(`(function(){${compilation}}())`);

console.log("\nJS EVAL");
console.log("=================================");
console.time("eval");
eval(`(function(){${compilation}}())`); //@TODO where to put this
console.timeEnd("eval");
