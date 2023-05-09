const { format } = require("./naming");
const { unread } = require("./reader");
const { parse } = require("./parser");
const { attempt } = require("./utils/utils");
const { safeLookup, createEnvironment, defineVariable } = require("./environment");
const {
  evaluateMacroDefinition,
  evaluate,
  expandMacro,
  isMacro,
} = require("./evaluator");
const primitives = require("./primitives");

//@TODO unuglify js
//@TODO objects

function compile(node, env) {
  switch (node.type) {
    case "num":
    case "str":
    case "bool":
      return JSON.stringify(node.value, env);
    case "quote":
      return compileQuote(node, env);
    case "var":
      return node.value;
    case "assignment":
      return compileAssignment(node, env);
    case "definition":
      return compileDefinition(node, env);
    case "if":
      return compileIf(node, env);
    case "let":
      return compileLet(node, env);
    case "lambda":
      return compileLambda(node, env);
    case "progn":
      return compileProgn(node, env);
    case "macrodefinition":
      return compileMacroDefinition(node, env);
    case "macroexpansion":
      return compileMacroExpansion(node, env);
    case "application":
      return compileApplication(node, env);
  }
}

function compileQuote(node) {
  return JSON.stringify(node.value); //`"${node.value}"`
}

function compileDefinition(node, env) {
  return `(${node.variable} = ${compile(node.value, env)})`;
}

function compileAssignment(node, env) {
  return `${node.variable} = ${compile(node.value, env)}`;
}

function compileIf(node, env) {
  let js = `(${compile(node.condition, env)} ? `;
  js += `${compile(node.body, env)} : `;
  if (node.elseBody) {
    js += `${compile(node.elseBody, env)})`;
  } else {
    js += `undefined )`;
  }
  return js;
}

function compileLet(node, env) {
  const values = node.values.map((n) => compile(n, env));
  let js = `(function `;
  js += `(${node.vars.join(",")})`;
  js += `{return ${compile(node.body, env)}})`;
  js += `(${values.join(",")})`;
  return js;
}

function compileLambda(node, env) {
  let js = `(function ${node.name ? node.name : ""}`;
  js += `(${node.params.join(",")})`;
  js += `{return ${compile(node.body, env)}})`;
  return js;
}

function compileProgn(node, env) {
  const sequence = node.nodes.map((n) => compile(n, env));
  return `(${sequence.join(", ")})`;
}

function compileMacroDefinition(node, env) {
  evaluateMacroDefinition(node, env);
  return '"[macrodefined]"';
}

function compileMacroExpansion(node, env) {
  const macro = evaluate(node.operator, env);
  const [expanded] = expandMacro(macro, node.args, env);
  return `'${unread(expanded)}'`;
}

function compileApplication(node, env) {
  // @TODO test macro inside macro
  const operatorName = compile(node.operator, env);
  const operator = safeLookup(operatorName, env);
  if (operator && isMacro(operator)) {
    const args = node._exp.slice(1); //@TODO abstract
    const [expanded, scope] = expandMacro(operator, args, env);
    return compile(parse(expanded, scope), scope);
  }
  let operands = node.operands.map((o) => compile(o, env));
  operands = operands.map((o) =>
    typeof o === "object" ? JSON.stringify(o) : o
  );
  return `${format(operatorName)}(${operands.join(",")})`;
}

// =======================================================

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

function createCompilationEnvironment(){

  const env = createEnvironment();
  for (let primitive of primitives) {
    defineVariable(primitive[0], primitive[1], env);
  }
  defineVariable("console", console, env);
  attempt(() => defineVariable("window", window, env));
  attempt(() => defineVariable("global", global, env));
  return env;
}

module.exports = { compile, createCompilationPrefix, createCompilationEnvironment };
