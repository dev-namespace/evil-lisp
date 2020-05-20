const { read } = require('./reader')
const { lookupVariable, defineVariable, defineVariables, setVariable, extendEnvironment} = require('./environment')

//@TODO: data-directed aproach so eval can be modified from outside
//@TODO: . operator

function evaluate(exp, env){
    console.log('exp', exp)
    const executionProcedure = analyze(exp)
    // console.log('proc', executionProcedure.toString())
    if(!executionProcedure) return wrong(`can't analyze ${exp}`)
    return executionProcedure(env)
}

function analyze(exp){
    if(isAtom(exp)){ //@TODO probably should go out
        if(isSelfEvaluating(exp)) return analyzeSelfEvaluating(exp)
        if(isVariable(exp)) return analyzeVariable(exp)
    } else {
        if(isQuoted(exp)) return analyzeQuoted(exp)
        if(isAssignment(exp)) return analyzeAssignment(exp)
        if(isDefinition(exp)) return analyzeDefinition(exp)
        if(isIf(exp)) return analyzeIf(exp)
        //@TODO cond
        if(isLambda(exp)) return analyzeLambda(exp)
        if(isProgn(exp)) return analyzeSequence(getPrognActions(exp))

        // everything else is considered application
        if(isApplication(exp)) return analyzeApplication(exp)
    }
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
    const operandsProc = map(analyze, getApplicationOperands(exp))
    return env => executeApplication(operatorProc(env), map(proc => proc(env), operandsProc))
}

function executeApplication(proc, args){
    // proc argument can be either a function initially in the global environment (primitive procedure)
    // or a compound procedure
    if(isCompoundProcedure(proc)){
        const extended = extendEnvironment(getProcedureEnvironment(proc))
        defineVariables(getProcedureParameters(proc), args, extended)
        return getProcedureBody(proc)(extended)
    }

    // primitive procedure
    return proc(...args)
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
    return env => evaluation
}

function analyzeQuoted(exp){
    const unquoted = unquote(exp)
    return env => unquoted
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

function unquote(exp){
    return second(exp) //@TODO: read?
}

//@TODO makeProgn
function makeProcedure(parameters, body, env){
    return ['procedure', parameters, body, env]
}

// Getters
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

function isCompoundProcedure(exp){
    return first(exp) === 'procedure'
}

//@TODO maybe primitives should share proc form with 'primitive
// function isPrimitiveProcedure(exp){
//     return first(exp) === 'primitive'
// }

function isTrue(exp){
    return exp !== 'false'
}

function isFalse(exp){
    return exp === 'false'
}

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

function wrong(error){
    return error
}

// utils
// ========================================

function isSurroundedBy(str, first, last){
    return str[0] === first || str.slice(-1) === last
}

module.exports = { evaluate }
