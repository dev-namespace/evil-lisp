const { isAtom, isUnquoted, isUnquoteSliced, parse } = require("./parser");
const { unread } = require("./reader");
const {
  lookupVariable,
  defineVariable,
  defineVariables,
  setVariable,
  extendEnvironment,
} = require("./environment");

function evaluate(node, env) {
  switch (node.type) {
    case "num":
    case "str":
    case "bool":
    case "quote":
      return node.value;
    case "syntaxquote":
      return evaluateSyntaxQuote(node, env);
    case "var":
      return evaluateVariable(node, env);
    case "assignment":
      return evaluateAssignment(node, env);
    case "definition":
      return evaluateDefinition(node, env);
    case "if":
      return evaluateIf(node, env);
    case "let":
      return evaluateLet(node, env);
    case "lambda":
      return evaluateLambda(node, env);
    case "progn":
      return evaluateProgn(node, env);
    case "macrodefinition":
      return evaluateMacroDefinition(node, env);
    case "macroexpansion":
      return evaluateMacroExpansion(node, env);
    case "application":
      return evaluateApplication(node, env);
  }
}

function evaluateVariable(node, env) {
  return lookupVariable(node.value, env);
}

function evaluateAssignment(node, env) {
  const value = evaluate(node.value, env);
  return setVariable(node.variable, value, env);
}

function evaluateDefinition(node, env) {
  const value = evaluate(node.value, env);
  return defineVariable(node.variable, value, env);
}

function evaluateIf(node, env) {
  if (evaluate(node.condition, env)) {
    return evaluate(node.body, env);
  } else {
    if (node.elseBody) return evaluate(node.elseBody, env);
  }
}

function evaluateLet(node, env) {
  const scope = extendEnvironment(env);
  for (let binding of node.bindings) {
    evaluate(
      { type: "definition", variable: binding[0], value: binding[1] },
      scope
    );
  }
  return evaluate(node.body, scope);
}

function evaluateProgn(node, env) {
  return node.nodes.map((n) => evaluate(n, env)).slice(-1)[0];
}

function evaluateLambda(node, env) {
  const body = node.body;
  const params = node.params;
  return (...args) => {
    const scope = createScope(params, args, env);
    const result = evaluate(body, scope);
    return result;
  };
}

function evaluateApplication(node, env) {
  const operator = evaluate(node.operator, env);
  if (isMacro(operator)) {
    const macro = evaluate(node.operator, env);
    const args = node._exp.slice(1); //@TODO abstract
    const [expanded, scope] = expandMacro(macro, args, env);
    return evaluate(parse(expanded), scope);
  }

  const args = node.operands.map((operand) => evaluate(operand, env));
  return operator(...args);
}

function evaluateMacroDefinition(node, env) {
  const macro = makeMacro(node.params, node.body);
  return defineVariable(node.name, macro, env);
}

function evaluateMacroExpansion(node, env) {
  const macro = evaluate(node.operator, env);
  const [expanded] = expandMacro(macro, node.args, env);
  return unread(expanded);
}

function evaluateSyntaxQuote(node, env) {
  const result = recursiveSyntaxUnquote(node.value, env); //@TODO if is atom...
  return result;
}

// Helpers
// ===============================================================
function expandMacro(macro, args, env) {
  const body = getMacroBody(macro);
  const params = getMacroParams(macro);
  const scope = createScope(params, args, env);
  const expanded = body.map((n) => evaluate(n, scope)).slice(-1)[0];
  return [expanded, scope];
}

function makeMacro(parameters, body) {
  return ["macro", parameters, body];
}

function getMacroBody(exp) {
  return exp[2];
}

function getMacroParams(exp) {
  return exp[1];
}

function isMacro(exp) {
  return exp[0] === "macro";
}

function syntaxUnquote(exp, env) {
  return evaluate(parse(exp[1]), env);
}

function recursiveSyntaxUnquote(exps, env) {
  let output = [];
  for (let exp of exps) {
    if (!isAtom(exp)) {
      if (isUnquoted(exp)) {
        output.push(syntaxUnquote(exp, env));
      } else if (isUnquoteSliced(exp)) {
        output.push(...syntaxUnquote(exp, env));
      } else {
        output.push(recursiveSyntaxUnquote(exp, env));
      }
    } else output.push(exp);
  }
  return output;
}

function createScope(params, args, env) {
  [params, args] = destructureArgs(params, args);
  const scope = extendEnvironment(env);
  defineVariables(params, args, scope);
  return scope;
}

function destructureArgs(params, args) {
  const restIndex = params.indexOf("&");
  if (restIndex >= 0) {
    const restArgs = args.slice(restIndex);
    outputParams = [...params.slice(0, restIndex), params[restIndex + 1]];
    outputArgs = [...args.slice(0, restIndex), restArgs];
    return [outputParams, outputArgs];
  }
  return [params, args];
}

module.exports = { evaluate, evaluateMacroDefinition, expandMacro, isMacro };
