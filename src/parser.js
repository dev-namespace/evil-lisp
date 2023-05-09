const { isSurroundedBy } = require('./utils/utils')

// DOMAIN NOTES
// ================================
// Atom         Not an s-expression
// Expression   S-expression or atom
// Parse        Given an expression, returns AST

function parse(exp){
    if(isSelfEvaluating(exp)) return parseSelfEvaluating(exp)
    if(isVariable(exp)) return parseVariable(exp)
    if(isQuoted(exp)) return parseQuoted(exp)
    if(isSyntaxQuoted(exp)) return parseSyntaxQuoted(exp)
    if(isAssignment(exp)) return parseAssignment(exp)
    if(isDefinition(exp)) return parseDefinition(exp)
    if(isIf(exp)) return parseIf(exp)
    if(isLet(exp)) return parseLet(exp)
    if(isLambda(exp)) return parseLambda(exp)
    if(isProgn(exp)) return parseSequence(getPrognActions(exp))
    if(isMacroDefinition(exp)) return parseMacroDefinition(exp)
    if(isMacroExpansion(exp)) return parseMacroExpansion(exp) // has to go here?
    if(isApplication(exp)) return parseApplication(exp)
}

// Parse functions
// ===============================================================
function parseSelfEvaluating(exp){
    if(isNumber(exp)) return { type: 'num', value: Number(exp)}
    if(isString(exp)) return { type: 'str', value: exp.slice(1, -1)}
    if(isBoolean(exp)) return { type: 'bool', value: isTrue(exp) ? true : false}
}

function parseVariable(exp){
    return { type: 'var', value: exp}
}

function parseQuoted(exp){
    let value = unquote(exp)
    return { type: 'quote', value}
}

function parseAssignment(exp){
    const variable = getAssignmentVariable(exp)
    const value = parse(getAssignmentValue(exp))
    return { type: 'assign', variable, value}
}

function parseDefinition(exp){
    const variable = getDefinitionVariable(exp)
    const value = parse(getDefinitionValue(exp))
    return { type: 'definition', variable, value}
}

function parseIf(exp){
    const condition = parse(getIfCondition(exp))
    const body = parse(getIfBody(exp))
    const elseBody = getIfElseBody(exp) ? parse(getIfElseBody(exp)) : undefined
    return { type: 'if', condition, body, elseBody}
}

function parseLet(exp){
    const bindingArr = getLetBindings(exp)
    const body = parseSequence(getLetBody(exp))
    const vars = map(first, bindingArr)
    const values = map(parse, map(second, bindingArr))
    const bindings = zip(vars, values)
    return { type: 'let', bindings, vars, values, body}
}

function parseSequence(exps){
    const nodes = map(parse, exps)
    if(isEmpty(exps)) wrong(`can't parse empty sequence`)
    return { type: 'progn', nodes }
}

function parseLambda(exp){
    const params = getLambdaParameters(exp)
    const body = parseSequence(getLambdaBody(exp))
    return { type: 'lambda', params, body}
}

function parseApplication(exp){
    // @TODO not very convinced about _exp, all should have it?
    const operator = parse(getApplicationOperator(exp))
    const operands = map(parse, getApplicationOperands(exp))
    return { type: 'application', operator, operands, _exp: exp}
}

function parseMacroDefinition(exp){
    const name = second(exp)
    const params = third(exp)
    const body = map(parse, rest(rest(rest(exp))))

    return { type: 'macrodefinition', name, params, body}
}

function parseMacroExpansion(exp){
    const macroCallExp = unquote(second(exp))
    const operator = parse(getApplicationOperator(macroCallExp))
    const args = getApplicationOperands(macroCallExp) // args are not analyzed
    return { type: 'macroexpansion', operator, args}
}

function parseSyntaxQuoted(exp){
    return { type: 'syntaxquote', value: unquote(exp)}
}

function unquote(exp){
    return second(exp)
}

// Getters
// ===============================================================
function getIfCondition(exp){
    return second(exp)
}

function getIfBody(exp){
    return third(exp)
}

function getIfElseBody(exp){
    return fourth(exp)
}

function getLetBindings(exp){
    return partition(second(exp), 2)
}

function getLetBody(exp){
    return rest(rest(exp))
}

function getApplicationOperator(exp){
    return first(exp)
}

function getApplicationOperands(exp){
    return rest(exp)
}

function getLambdaParameters(exp){
    return second(exp)
}

function getLambdaBody(exp){
    return rest(rest(exp))
}

function getPrognActions(exp){
    return rest(exp)
}

function getAssignmentVariable(exp){
    return second(exp)
}

function getDefinitionVariable(exp){
    return second(exp)
}

function getAssignmentValue(exp){
    return third(exp)
}

function getDefinitionValue(exp){
    return third(exp)
}

// Predicates
// ===============================================================
function isAtom(exp){
    return typeof exp !== 'object'
}

function isString(exp){
    return isSurroundedBy(exp, '"', '"')
}

function isNumber(exp){
    return !isNaN(Number(exp))
}

function isBoolean(exp){
    return exp === 'true' || exp === 'false'
}

function isSymbol(exp){
    return !isNumber(exp) && !isString(exp) && !isBoolean(exp) && isAtom(exp)
}

function isVariable(exp){
    return isSymbol(exp)
}

function isSelfEvaluating(exp){
    return isString(exp) || isNumber(exp) || isBoolean(exp)
}

function isQuoted(exp){
    return first(exp) === "quote"
}

function isSyntaxQuoted(exp){
    return first(exp) === 'syntaxquote'
}

function isUnquoted(exp){
    return first(exp) === "unquote"
}

function isUnquoteSliced(exp){
    return first(exp) === "unquoteslice"
}

function isAssignment(exp){
    return first(exp) === 'set!'
}

function isDefinition(exp){
    return first(exp) === 'def'
}

function isIf(exp){
    return first(exp) === 'if'
}

function isLet(exp){
    return first(exp) === 'let'
}

function isLambda(exp){
    return first(exp) === 'lambda' || first(exp) === 'fn'
}

function isProgn(exp){
    return first(exp) === 'progn'
}

function isApplication(exp){
    return !isAtom(exp)
}

function isMacroDefinition(exp){
    return first(exp) === 'defmacro'
}

function isMacroExpansion(exp){
    return first(exp) === 'macroexpand'
}

function isTrue(exp){
    return exp !== 'false'
}

function isFalse(exp){
    return exp === 'false'
}

// Sequence
// ===============================================================
function first(seq){
    return seq[0]
}

function second(seq){
    return seq[1]
}

function third(seq){
    return seq[2]
}

function fourth(seq){
    return seq[3]
}

function rest(seq){
    return seq.slice(1)
}

function isLast(seq){
    return seq.length === 1
}

function isEmpty(seq){
    return seq.length === 0
}

function map(func, seq){
    return seq.map(func)
}

function partition(seq, size) {
    seq = [...seq]
    const output = []
    while(seq.length > 0){
        output.push(seq.splice(0, size))
    }
    return output
}

function zip(a, b){
    return a.map((e, i) => [e, b[i]])
}

// Misc.
// ===============================================================
function wrong(error){
    return error
}

module.exports = { parse, isAtom, isUnquoted, isUnquoteSliced }
