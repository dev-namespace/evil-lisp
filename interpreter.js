const { unread } = require('./reader')
const { isSurroundedBy } = require('./utils')
const { lookupVariable, defineVariable, defineVariables, setVariable, extendEnvironment} = require('./environment')

function evaluate(exp, env){
    // console.log('exp', exp)
    const executionProcedure = analyze(exp)
    if(!executionProcedure) return wrong(`can't analyze ${exp}`)
    return executionProcedure(env)
}

function analyze(exp){
    //@TODO: data-directed aproach so eval can be modified from outside
    if(isSelfEvaluating(exp)) return analyzeSelfEvaluating(exp)
    if(isVariable(exp)) return analyzeVariable(exp)
    if(isQuoted(exp)) return analyzeQuoted(exp)
    if(isSyntaxQuoted(exp)) return analyzeSyntaxQuoted(exp)
    if(isAssignment(exp)) return analyzeAssignment(exp)
    if(isDefinition(exp)) return analyzeDefinition(exp)
    if(isIf(exp)) return analyzeIf(exp)
    //@TODO cond <- or should they be macros?
    //@TODO let <- or should they be macros?
    if(isLambda(exp)) return analyzeLambda(exp)
    if(isProgn(exp)) return analyzeSequence(getPrognActions(exp))
    if(isMacroDefinition(exp)) return analyzeMacroDefinition(exp)
    if(isMacroExpansion(exp)) return analyzeMacroExpansion(exp) // has to go here?
    if(isApplication(exp)) return analyzeApplication(exp)
}

// Analyze functions
// ===============================================================
function analyzeMacroDefinition(exp){
    const name = second(exp)
    const params = third(exp)
    const body = rest(rest(rest(exp)))
    return env => {
        const macro = makeMacro(params, body, env)
        defineVariable(name, macro, env)
        return macro
    }
}

function analyzeMacroExpansion(exp){
    const macroExp = unquote(second(exp))
    const operatorProc = analyze(getApplicationOperator(macroExp))
    return env => {
        const proc = operatorProc(env)
        const args = getApplicationOperands(macroExp) // args are not analyzed
        return unread(expandMacro(proc, args))
    }
}

function expandMacro(proc, args){
    //@TODO abstract access
    const body = third(proc)
    const extended = createScope(proc, args)
    //@TODO maybe executeSequence?
    return map(proc => evaluate(proc, extended), body).slice(-1)
}

function analyzeApplication(exp){
    const operatorProc = analyze(getApplicationOperator(exp))
    return env => {
        const proc = operatorProc(env)
        if(isMacro(proc)){
            const macroEnv = extendEnvironment(env) // macros have their own scope
            const args = getApplicationOperands(exp) // args are not analyzed
            const expanded = expandMacro(proc, args)
            return map(proc => evaluate(proc, macroEnv), expanded)
        }

        // we're trading off arg evaluation efficiency for macros here
        const operandsProc = map(analyze, getApplicationOperands(exp))
        const args = map(proc => proc(env), operandsProc)
        return executeProcedure(proc, args)
    }
}

function createScope(proc, args){
    //@TODO factor arg destructuring into another function
    const params = getProcedureParameters(proc)
    const extended = extendEnvironment(getProcedureEnvironment(proc))
    const restIndex = params.indexOf('&')
    if(restIndex >= 0){
        const restArgs = args.slice(restIndex)
        defineVariables(params.slice(0, restIndex), args.slice(0, restIndex), extended)
        defineVariable(params[restIndex + 1], restArgs, extended)
    } else {
        defineVariables(params, args, extended)
    }
    return extended
}

function executeProcedure(proc, args){
    // proc argument can be either a function initially in the global environment (primitive procedure)
    // or a compound procedure
    if(isCompoundProcedure(proc)){
        const scope = createScope(proc, args)
        return getProcedureBody(proc)(scope)
    }
    if(isPrimitiveProcedure(proc)){
        return executePrimitiveProcedure(proc, args)
    }
}

function executePrimitiveProcedure(proc, args){
    //@TODO stop being lazy and abstract access
    return second(proc)(args)
}

function executeSequence(procs, env) { //@TODO no need to be inside..?
    if(isLast(procs)) return first(procs)(env)
    else {
        first(procs)(env)
        return executeSequence(rest(procs), env)
    }
}

function analyzeSequence(exps){
    const procs = map(analyze, exps)
    if(isEmpty(procs)) wrong(`can't analyze empty sequence`)
    return env => executeSequence(procs, env)
}

function analyzeLambda(exp){
    const vars = getLambdaParameters(exp)
    const bodyProcedure = analyzeSequence(getLambdaBody(exp))
    // the procedure contains the environment in which the lambda was defined
    // procedure packages args, body and environment
    return env => makeProcedure(vars, bodyProcedure, env)
}

function analyzeSelfEvaluating(exp){
    let evaluation
    if(isNumber(exp)) evaluation = Number(exp)
    if(isBoolean(exp)) evaluation = isTrue(exp) ? true : false
    if(isString(exp)) evaluation = exp.slice(1, -1)
    return env => evaluation
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

function analyzeSyntaxQuoted(exp){
    // we assume it's a list
    return env => {
        const unquoted = unquote(exp)
        if(isAtom(unquoted)) return unquoted
        const result = recursiveSyntaxUnquote(unquoted, env)
        return result
    }
}

function analyzeQuoted(exp){
    const unquoted = unquote(exp)
    return env => unquoted
}

function syntaxUnquote(exp, env){
    return evaluate(second(exp), env)
}

function unquote(exp){
    return second(exp) //@TODO: read?
}

function analyzeVariable(exp){
    return env => lookupVariable(exp, env)
}

function analyzeAssignment(exp){
    const variable = getAssignmentVariable(exp)
    const proc = analyze(getAssignmentValue(exp))
    return env => setVariable(variable, proc(env), env)
}

function analyzeDefinition(exp){
    const variable = getDefinitionVariable(exp)
    const proc = analyze(getDefinitionValue(exp))
    return env => defineVariable(variable, proc(env), env)
}

function analyzeIf(exp){
    const cproc = analyze(getIfCondition(exp))
    const bproc = analyze(getIfBody(exp))
    const eproc = getIfElseBody(exp) ? analyze(getIfElseBody(exp)) : undefined
    return env => {
        if(cproc(env)){
            return bproc(env)
        } else {
            if(eproc) return eproc(env)
        }
    }
}

function makeProcedure(parameters, body, env){
    return ['procedure', parameters, body, env]
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

function getProcedureBody(exp){
    return third(exp)
}

function getProcedureParameters(exp){
    return second(exp)
}

function getProcedureEnvironment(exp){
    return fourth(exp)
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

function isPrimitiveProcedure(exp){
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

module.exports = { evaluate, analyze, executeProcedure }
