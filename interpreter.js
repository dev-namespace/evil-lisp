const { read, InputStream } = require('./reader')
const { isSurroundedBy, recursiveMap } = require('./utils')
const { lookupVariable, defineVariable, defineVariables, setVariable, extendEnvironment} = require('./environment')

function evaluate(exp, env){
    console.log('exp', exp)
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
    if(isApplication(exp)) return analyzeApplication(exp)
}

// Analyze functions
// ===============================================================

function analyzeMacroDefinition(exp){
    console.log('analyzing macro')
    const name = second(exp)
    const args = third(exp)
    // const bodyProcedure = analyzeSequence(rest(rest(rest(exp))))
    const body = rest(rest(rest(exp)))
    // console.log('BODY:', body[0][1])
    return env => {
        const macro = makeMacro(args, body, env)
        defineVariable(name, macro, env)
        return macro
    }
}

function makeMacro(args, body, env){
    return ['macro', args, body, env]
}

function isMacroDefinition(exp){
    return first(exp) === 'defmacro'
}

function isMacro(exp){
    return first(exp) === 'macro'
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

function analyzeApplication(exp){
    const operatorProc = analyze(getApplicationOperator(exp))
    return env => {
        const proc = operatorProc(env)
        if(isMacro(proc)){
            //@TODO abstract access
            // const operandsProc = map(analyze, getApplicationOperands(exp))
            // const args = map(proc => proc(env), operandsProc)
            const args = getApplicationOperands(exp) // args are not analyzed
            // console.log('MAKRO', proc)
            // console.log('MAKROARGs', args)
            const procParams = second(proc)
            const procEnv = fourth(proc)
            const extended = extendEnvironment(procEnv)
            defineVariables(procParams, args, extended)
            // console.log('EXTENDED!!!!:', extended)
            const expanded = expandMacro(proc, extended)
            // console.log('expanded:', expanded)

            return map(proc => evaluate(proc, extended), expanded)
            // const evaluation = evaluate(expanded, extended)
            // console.log('evaluation:', evaluation)
            // return evaluation
        }

        // we're trading off arg evaluation efficiency for macros here
        const operandsProc = map(analyze, getApplicationOperands(exp))
        const args = map(proc => proc(env), operandsProc)
        return executeApplication(proc, args)
    }
}

function executeApplication(proc, args){
    // proc argument can be either a function initially in the global environment (primitive procedure)
    // or a compound procedure
    if(isCompoundProcedure(proc)){
        const extended = extendEnvironment(getProcedureEnvironment(proc))
        defineVariables(getProcedureParameters(proc), args, extended)
        return getProcedureBody(proc)(extended)
    }
    if(isPrimitiveProcedure(proc)){
        return executePrimitiveProcedure(proc, args)
    }
}

function expandMacro(proc, env){
    //@TODO abstract access
    const body = third(proc)
    // console.log('preexpand:', body)
    // console.log('preexpand-detail:', body[0][1])
    return map(proc => evaluate(proc, env), body)
    // return evaluate(third(proc), env)
    // return third(proc)(args)
}

function executePrimitiveProcedure(proc, args){
    //@TODO abstract access
    return second(proc)(args)
}

function analyzeSequence(exps){
    // @TODO: maybe procs is not the best name
    // @TODO: this could be done with reduce
    const executeSequence = (procs, env) => { //@TODO no need to be inside..?
        if(isLast(procs)) return first(procs)(env)
        else {
            first(procs)(env)
            return executeSequence(rest(procs), env)
        }
    }
    const procs = map(analyze, exps)
    if(isEmpty(procs)) wrong(`empty sequence in analyze`)
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
        // console.log('PROGRESS', exp)
        if(typeof exp === 'object') {
            // console.log('isObject')
            if(isUnquoted(exp)){
                output.push(syntaxUnquote(exp, env))
            } else {
                output.push(recursiveSyntaxUnquote(exp, env))
            }
        }
        else output.push(exp)
        // console.log('PROGRESS-OOO', output)
    }
    return output
}

function analyzeSyntaxQuoted(exp){
    // we assume it's a list
    return env => {
        const unquoted = unquote(exp)
        // console.log('YYYY', unquoted)
        // const result = recursiveMap(exp => isUnquoted(exp) ? syntaxUnquote(exp, env) : exp, unquoted)
        const result = recursiveSyntaxUnquote(unquoted, env)
        // console.log('XXXX', result)
        return result
    }
}

function analyzeQuoted(exp){
    const unquoted = unquote(exp)
    return env => unquoted
}

function syntaxUnquote(exp, env){
    // console.log('syntaxunquote:', second(exp))
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

function makeProcedure(parameters, body, env){
    return ['procedure', parameters, body, env]
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
    return first(exp) === 'lambda'
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

module.exports = { evaluate }
