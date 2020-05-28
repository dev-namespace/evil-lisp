const { parseFile } = require('./files')
const { unread } = require('./reader')
const { parse } = require('./parser')
const { safeLookup, extendEnvironment, createEnvironment } = require('./environment')
const { evaluateMacroDefinition, evaluate, expandMacro, isMacro } = require('./evaluator')
const { primitives } = require('./primitives')
const path = require('path')

//@TODO Check object management

// Public interface
// ========================================================================
function compileEntry(node, env){
    // Compiles the entry point
    let compiled = compileNode(node, env)
    compiled += `;\nmodule.exports = {${env.exports.map(n => n.variable).join(',')}}`
    return compiled
}

function compileModule(node, env){
    // Compiles an *evlisp required* module
    const moduleRelativePath = compileNode(node.operands[0], env).slice(1, -1)
    const modulePath = path.join(path.dirname(env.path), moduleRelativePath)
    if(env.cachedModules[modulePath]) return env.cachedModules[modulePath]
    const moduleEnv = extendCompilationEnvironment(env)
    moduleEnv.exports = []
    moduleEnv.scope = "__current_module__"
    moduleEnv.path = modulePath
    let compiled = compileNode(parseFile(modulePath), moduleEnv)
    compiled = `${moduleEnv.scope} = {},` + compiled
    cacheModule(modulePath, moduleEnv, env)
    return compiled
}

function compilePrimitivePrefix(){
    let js = `const __primitives = {\n`
    for (let primitive of primitives){
        js += `\t"${primitive[0]}": ${primitive[1]},\n`
    }
    js += `};`
    return js
}

function createCompilationEnvironment(){
    const env = createEnvironment()
    env.path = ""
    env.opts = {}
    env.cachedModules = {}
    env.exports = []
    return env
}

function extendCompilationEnvironment(parent){
    const env = extendEnvironment(parent)
    env.path = parent.path
    env.opts = parent.opts
    env.cachedModules = parent.cachedModules
    env.exports = []
    return env
}


module.exports = { compileEntry,
                   compileModule,
                   compilePrimitivePrefix,
                   createCompilationEnvironment,
                   extendCompilationEnvironment }

// Node Compilation
// ========================================================================
function compileNode(node, env){
    switch(node.type){
        case "num":
        case "str":
        case "bool": return JSON.stringify(node.value, env)
        case "quote": return  compileQuote(node, env)
        case "var": return compileVar(node, env)
        case "assignment": return compileAssignment(node, env)
        case "definition": return compileDefinition(node, env)
        case "if": return compileIf(node, env)
        case "let": return compileLet(node, env)
        case "lambda": return compileLambda(node, env)
        case "progn": return compileProgn(node, env)
        case "macrodefinition": return compileMacroDefinition(node, env)
        case "macroexpansion": return compileMacroExpansion(node, env)
        case "application": return compileApplication(node, env)
    }
}

function compileQuote(node){
    return JSON.stringify(node.value)
}

function compileVar(node, env){
    return node.value
}

function compileAssignment(node, env){
    return `${node.variable} = ${compileNode(node.value, env)}`
}

function compileDefinition(node, env){
    env.exports.push(node)
    return `(${scopeVariable(node.variable, env)} = ${compileNode(node.value, env)})`
}

function compileIf(node, env){
    let js = `(${compileNode(node.condition, env)} ? `
    js += `${compileNode(node.body, env)} : `
    if(node.elseBody){
        js+= `${compileNode(node.elseBody, env)})`
    } else {
        js+= `undefined )`
    }
    return js
}

function compileLet(node, env){
    const values = node.values.map(n => compileNode(n, env))
    let js = `(function _let`
    js += `(${node.vars.join(',')})`
    js += `{return ${compileNode(node.body, env)}})`
    js += `(${values.join(',')})`
    return js
}

function compileLambda(node, env){
    let js = `(function ${node.name ? node.name : ''}`
    js += `(${node.params.join(',')})`
    js += `{return ${compileNode(node.body, env)}})`
    return js
}

function compileProgn(node, env){
    const sequence = node.nodes.map(n => compileNode(n, env))
    return `(${sequence.join(', ')})`
}

function compileMacroDefinition(node, env){
    evaluateMacroDefinition(node, env.getRootEnvironment())
    return '"[macrodefined]"'
}

function compileMacroExpansion(node, env){
    const macro = evaluate(node.operator, env)
    const [expanded] = expandMacro(macro, node.args, env)
    return `'${unread(expanded)}'`
}

function compileApplication(node, env){
    // @TODO test macro inside macro
    const operatorName = compileNode(node.operator, env)
    const operator = safeLookup(operatorName, env)
    if(operator && isMacro(operator)){
        const args = node._exp.slice(1) //@TODO abstract
        const [expanded, scope] = expandMacro(operator, args, env)
        return compileNode(parse(expanded, scope), scope)
    }

    // module require
    if(operatorName === 'require' && !env.opts.noImports){
        return compileModule(node, env)
    }

    // @TODO: macro-import

    // Compounds and primitives
    let operands = node.operands.map(o => compileNode(o, env))
    operands =  operands.map(o => typeof o === 'object' ? JSON.stringify(o) : o)
    const prims = primitives.map(x => x[0]) // @TODO don't do this every time, let primitives export it
    const formated = formatVariableName(operatorName)
    const scoped = scopeVariable(formated, env)
    return `${prims.includes(operatorName) ? ('__primitives["' + operatorName + '"]') : scoped}(${operands.join(',')})`
}

// Misc.
// ========================================================================
function scopeVariable(variable, env){
    return env.scope ? `${env.scope}.${variable}` : variable
}

function scopeAst(ast, env){
    if(!env.scope) return ast
    return {type: 'let', vars: [env.scope], values: [{type: 'str', value: {}}], bindings: [], body: ast}
}

function formatVariableName(name){
    return name.replace(/\//g, '.')
}

function cacheModule(path, moduleEnv, env){
    let js = `{${moduleEnv.exports.map(e => `${e.variable}: ${compileNode(e.value, moduleEnv)}`).join(', ')}}`
    env.cachedModules[path] = js
}
