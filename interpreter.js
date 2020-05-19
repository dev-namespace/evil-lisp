const { read } = require('./reader')

//@TODO: defn
//@TODO: evaluate in set!

//@TODO: parsing is intermingled with evaluation, separate
//@TODO: in other words: lisp reader! -> manage ' to quote


// analyze
function analyze(exp){
    if(isAtom(exp)){
        if(isSelfEvaluating(exp)) return analyzeSelfEvaluating(exp)
        if(isQuoted(exp)) return analyzeQuoted(exp) //@TODO: when to read again to evaluate (quote x)?
    } else {
        if(isQuoted(exp)) return analyzeQuoted(exp)
    }
}

function analyzeSelfEvaluating(exp){
    return env => exp
}

function analyzeQuoted(exp){
    const unquoted = unquote(exp)
    return env => unquoted
}

function evaluate(syntax, env){
    const exp = read(syntax)
    console.log('exp', exp)
    const executionProcedure = analyze(exp)
    if(!executionProcedure) return wrong(`can't analyze ${exp}`)
    return executionProcedure(env)
}

function unquote(exp){
    exp = read(exp)
    console.log('unq', exp)
    return second(exp) //@TODO: read?
}


// eval
// function evaluate(exp, env = {}){
//     console.log('exp', exp)
//     if(isAtom(exp)){
//         if(isVariable(exp, env)){
//             return lookUp(exp, env)
//         }
//         if(isSelfEvaluating(exp)){
//             return exp
//         }
//         if(isQuoted(exp)){
//             return exp
//         }
//         return wrong(`cannot evaluate ${exp}`)
//     } else { // is form
//         if(isAssignment(exp)) return evalAssignment(exp, env)
//         if(isDefinition(exp)) return evalDefinition(exp, env)
//         // [...]
//         return wrong(`"${first(exp)}" is not a function`)
//     }
// }

function wrong(error){
    return error
}

function evalAssignment(exp, env){
    if(!isVariable(second(exp), env)) return wrong(`${second(exp)} is not defined`)
    env[second(exp)] = third(exp)
    return env[second(exp)]
}

function evalDefinition(exp, env){
    env[second(exp)] = third(exp)
    return env[second(exp)]
}

function isAtom(exp){
    // return !isSurroundedBy(exp, '(', ')')
    return typeof exp !== 'object'
}

function isString(exp){
    return isSurroundedBy(exp, '"', '"')
}

function isNumber(exp){
    return !isNaN(Number(exp))
}

function isBoolean(exp){
    return typeof exp === 'boolean'
}

function isSymbol(exp, env){
    return env.hasOwnProperty(exp)
}

function isVariable(exp, env){
    return env.hasOwnProperty(exp)
}

function isSelfEvaluating(exp){
    return isString(exp) || isNumber(exp) || isBoolean(exp)
}

function isQuoted(exp){
    console.log('isquoted', first(exp))
    return first(exp) === "quote"
}

function isAssignment(exp){
    return first(exp) === 'set!'
}

function isDefinition(exp){
    return first(exp) === 'def'
}

function first(exp){
    return exp[0]
}

function second(exp){
    return exp[1]
}

function third(exp){
    return exp[2]
}

function lookUp(key, env){
    return env[key]
}

// utils
// ========================================

function isSurroundedBy(str, first, last){
    return str[0] === first || str.slice(-1) === last
}

module.exports = { evaluate }
