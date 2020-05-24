const { unread } = require('./reader')
const { isSurroundedBy } = require('./utils')
const { lookupVariable,
        defineVariable,
        defineVariables,
        setVariable,
        extendEnvironment } = require('./environment')

// DOMAIN NOTES
// ================================
// Atom         Not an s-expression
// Expression   S-expression or atom
// Analyze      Given an expression, generates the pertinent execution function
// Execution    Does what analysis determined should be done taking environment into account
// Evaluation   Analysis + execution
// Procedure    Compound procedure: ['procedure', parameters, bodyExecution, env]
// Primitive    Primitive procedure: ['primitive', function]

function parse(exp){
    if(isSelfEvaluating(exp)) return parseSelfEvaluating(exp)
    if(isVariable(exp)) return parseVariable(exp)
    if(isQuoted(exp)) return parseQuoted(exp)
    if(isSyntaxQuoted(exp)) return parseSyntaxQuoted(exp)
    if(isAssignment(exp)) return parseAssignment(exp)
    if(isDefinition(exp)) return parseDefinition(exp)
    if(isIf(exp)) return parseIf(exp)
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
    //@TODO not very convinced...
    // if not an atom, return a list!
    console.log('VALUE', value)
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
    const operator = parse(getApplicationOperator(exp))
    const operands = map(parse, getApplicationOperands(exp))
    // @TODO kind? primitive, macro, etc.
    // @TODO not very convinced about _exp, all should have it?
    return { type: 'application', operator, operands, _exp: exp}

    // return env => {
    //     const operator = operatorExec(env)
    //     if(isMacro(operator)){
    //         const macroEnv = extendEnvironment(env) // macros have their own scope
    //         const args = getApplicationOperands(exp) // args are not analyzed
    //         const expanded = expandMacro(operator, args)
    //         return evaluate(expanded, macroEnv)
    //     }

    //     const args = map(proc => proc(env), operandsExec)
    //     return executeProcedure(operator, args)
    // }
}

function parseMacroDefinition(exp){
    const name = second(exp)
    const params = third(exp)
    const body = map(parse, rest(rest(rest(exp))))

    return { type: 'macrodefinition', name, params, body}
    // return env => {
    //     const macro = makeMacro(params, body, env)
    //     defineVariable(name, macro, env)
    //     return macro
    // }
}

function parseMacroExpansion(exp){
    const macroCallExp = unquote(second(exp))
    // const operatorExec = analyze(getApplicationOperator(macroCallExp))
    operator = parse(getApplicationOperator(macroCallExp))
    const args = getApplicationOperands(macroCallExp) // args are not analyzed
    return { type: 'macroexpansion', operator, args}
    // return env => {
    //     const macro = operatorExec(env)
    //     return unread(expandMacro(macro, args))
    // }
}

// Analyze functions
// ===============================================================


function expandMacro(macro, args){
    const body = getMacroBody(macro)
    const extended = createScope(macro, args)
    return analyzeSequence(body)(extended)
}

function destructureArgs(params, args){
    const restIndex = params.indexOf('&')
    if(restIndex >= 0){
        const restArgs = args.slice(restIndex)
        outputParams = [...params.slice(0, restIndex), params[restIndex + 1]]
        outputArgs = [...args.slice(0, restIndex), restArgs]
        return [outputParams, outputArgs]
    }
    return [params, args]
}

function createScope(proc, args){
    let params = getProcedureParameters(proc)
    ;[params, args] = destructureArgs(params, args)
    const scope = extendEnvironment(getProcedureEnvironment(proc))
    defineVariables(params, args, scope)
    return scope
}

function executeProcedure(proc, args){
    if(isCompoundProcedure(proc)){
        const scope = createScope(proc, args)
        return getProcedureBodyExecution(proc)(scope)
    }
    if(isPrimitive(proc)){
        return executePrimitive(proc, args)
    }
}

function executePrimitive(primitive, args){
    return getPrimitiveFunction(primitive)(args)
}

function executeSequence(procs, env) {
    if(isLast(procs)) return first(procs)(env)
    else {
        first(procs)(env)
        return executeSequence(rest(procs), env)
    }
}

function recursiveSyntaxUnquote(exps, env){
    let output = []
    for(let exp of exps){
        if(!isAtom(exp)) {
            if(isUnquoted(exp)){
                output.push(syntaxUnquote(exp, env))
            } else if(isUnquoteSliced(exp)){
                output.push(...syntaxUnquote(exp, env))
            } else {
                output.push(recursiveSyntaxUnquote(exp, env))
            }
        }
        else output.push(exp)
    }
    return output
}

function parseSyntaxQuoted(exp){
    return { type: 'syntaxquote', value: unquote(exp)}
    // return env => {
    //     const unquoted = unquote(exp)
    //     if(isAtom(unquoted)) return unquoted
    //     const result = recursiveSyntaxUnquote(unquoted, env)
    //     return result
    // }
}

function syntaxUnquote(exp, env){
    return evaluate(second(exp), env)
}

function unquote(exp){
    return second(exp)
}

function makeProcedure(parameters, bodyExecution, env){
    return ['procedure', parameters, bodyExecution, env]
}

function makeMacro(parameters, body, env){
    return [ 'macro', parameters, body, env ]
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

function getPrimitiveFunction(exp){
    return second(exp)
}

function getProcedureBodyExecution(exp){
    return third(exp)
}

function getProcedureParameters(exp){
    return second(exp)
}

function getProcedureEnvironment(exp){
    return fourth(exp)
}

function getMacroBody(exp){
    return third(exp)
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

function isLambda(exp){
    return first(exp) === 'lambda' || first(exp) === 'fn'
}

function isProgn(exp){
    return first(exp) === 'progn'
}

function isApplication(exp){
    return !isAtom(exp)
}

function isPrimitive(exp){
    return first(exp) === 'primitive'
}

function isCompoundProcedure(exp){
    return first(exp) === 'procedure'
}

function isMacroDefinition(exp){
    return first(exp) === 'defmacro'
}

function isMacroExpansion(exp){
    return first(exp) === 'macroexpand'
}

function isMacro(exp){
    return first(exp) === 'macro'
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

// Misc.
// ===============================================================
function wrong(error){
    return error
}

module.exports = { parse, isAtom, isUnquoted, isUnquoteSliced }
