const { createEnvironment, defineVariable } = require("./environment");
const primitives = require("./primitives");
const { format } = require("./naming");
const { evaluate } = require("./evaluator");
const { compile, createCompilationEnvironment, createCompilationPrefix } = require("./compiler");
const { parse } = require("./parser");
const { read, InputStream } = require("./reader");
const readline = require("readline");

let quit = false;
let rl

function pprint(msg) {
  console.log(JSON.stringify(msg, null, 2));
}

function prompt(question) {
  return new Promise((resolve, reject) => {
    rl.question(question, (input) => {
      if (input === "q") quit = true;
      resolve(input);
    });
  });
}

function compileAndEval(ast, env, prefix){
  const compilation = prefix + "\n" + compile(ast, env);
  if (process.argv.debug) {
    return verboseCompiledEvaluation(ast, compilation, () => eval(compilation));
  } else {
    return eval(compilation);
  }
}

async function repl(env, debug = false) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prefix = createCompilationPrefix();

  while (!quit) {
    try {
      const input = await prompt("> ");
      if (quit) break;
      const ast = parse(read(InputStream(input)), env);
      const result = compileAndEval(ast, env, prefix)
      console.log(result)
    } catch (err) {
      console.log(err);
    }
  }
  rl.close();
}

module.exports = {
  repl
}
