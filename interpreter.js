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

function evaluate(exp, env){
    const execution = analyze(exp)
    if(!execution) return wrong(`can't analyze ${exp}`)
    return execution(env)
}

function analyze(exp){
    //@TODO: data-directed aproach so analyze can be modified from outside
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
    const macroCallExp = unquote(second(exp))
    const operatorExec = analyze(getApplicationOperator(macroCallExp))
    const args = getApplicationOperands(macroCallExp) // args are not analyzed
    return env => {
        const macro = operatorExec(env)
        return unread(expandMacro(macro, args))
    }
}

function expandMacro(macro, args){
    const body = getMacroBody(macro)
    const extended = createScope(macro, args)
    return analyzeSequence(body)(extended)
}

function analyzeApplication(exp){
    const operatorExec = analyze(getApplicationOperator(exp))
    const operandsExec = map(analyze, getApplicationOperands(exp))
    return env => {
        const operator = operatorExec(env)
        if(isMacro(operator)){
            const macroEnv = extendEnvironment(env) // macros have their own scope
            const args = getApplicationOperands(exp) // args are not analyzed
            const expanded = expandMacro(operator, args)
            return evaluate(expanded, macroEnv)
        }

        const args = map(proc => proc(env), operandsExec)
        return executeProcedure(operator, args)
    }
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

function analyzeSequence(exps){
    const executions = map(analyze, exps)
    if(isEmpty(executions)) wrong(`can't analyze empty sequence`)
    return env => executeSequence(executions, env)
}

function analyzeLambda(exp){
    const vars = getLambdaParameters(exp)
    const bodyExec = analyzeSequence(getLambdaBody(exp))
    return env => makeProcedure(vars, bodyExec, env)
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
    return second(exp)
}

function analyzeVariable(exp){
    return env => lookupVariable(exp, env)
}

function analyzeAssignment(exp){
    const variable = getAssignmentVariable(exp)
    const exec = analyze(getAssignmentValue(exp))
    return env => setVariable(variable, exec(env), env)
}

function analyzeDefinition(exp){
    const variable = getDefinitionVariable(exp)
    const exec = analyze(getDefinitionValue(exp))
    return env => defineVariable(variable, exec(env), env)
}

function analyzeIf(exp){
    const conditionExec = analyze(getIfCondition(exp))
    const bodyExec = analyze(getIfBody(exp))
    const elseExec = getIfElseBody(exp) ? analyze(getIfElseBody(exp)) : undefined
    return env => {
        if(conditionExec(env)){
            return bodyExec(env)
        } else {
            if(elseExec) return elseExec(env)
        }
    }
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

module.exports = { evaluate, analyze, executeProcedure }
