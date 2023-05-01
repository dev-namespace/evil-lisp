const { createEnvironment, defineVariable } = require("./environment");
const primitives = require("./primitives");
const { format } = require("./naming");
const { evaluate } = require("./evaluator");
const { compile } = require("./compiler");
const { parse } = require("./parser");
const { read, InputStream } = require("./reader");
const readline = require("readline");

let quit = false;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function createGlobalEnvironment() {
  const env = createEnvironment();
  for (let primitive of primitives) {
    defineVariable(primitive[0], primitive[1], env);
  }
  defineVariable("console", console, env);
  return env;
}

function compilePrimitive(primitive) {
  return primitive[1].toString();
}

function createCompilationPrefix() {
  let output = "";
  for (let primitive of primitives) {
    output += compilePrimitive(primitive) + ";\n";
  }
  return output;
}

async function launch(debug = false) {
  const env = createGlobalEnvironment();
  const prefix = createCompilationPrefix();

  while (!quit) {
    try {
      const input = await prompt("> ");
      if (quit) break;
      const ast = parse(read(InputStream(input)), env);
      const compilation = prefix + "\n" + compile(ast, env);
      // console.log("argv2", argv);
      if (argv.debug) {
        verboseCompiledEvaluation(ast, compilation, () => eval(compilation));
      } else {
        eval(compilation);
      }
    } catch (err) {
      console.log(err);
    }
  }
  rl.close();
}
