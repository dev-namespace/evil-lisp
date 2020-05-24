const { format } = require('./naming')
const primitives = require('./primitives')

//@TODO unuglify js
//@TODO objects
//@TODO macros

function compile(node){
    switch(node.type){
        case "num":
        case "str":
        case "bool": return JSON.stringify(node.value)
        case "quote": return  compileQuote(node)
        case "var": return node.value
        case "assignment": return compileAssignment(node)
        case "definition": return compileDefinition(node)
        case "if": return compileIf(node)
        case "lambda": return compileLambda(node)
        case "progn": return compileProgn(node)
        case "application": return compileApplication(node)
    }
}

function compileQuote(node){
    return node.value
}

function compileDefinition(node){
    return `(${node.variable} = ${compile(node.value)})`
}

function compileAssignment(node){
    return `${node.variable} = ${compile(node.value)}`
}

function compileIf(node){
    let js = `(${compile(node.condition)} ? `
    js += `${compile(node.body)} : `
    if(node.elseBody){
        js+= `${compile(node.elseBody)})`
    } else {
        js+= `undefined )`
    }
    return js
}

function compileLambda(node){
    let js = `(function ${node.name ? node.name : ''}`
    js += `(${node.params.join(',')})`
    js += `{return ${compile(node.body)}})`
    return js
}

function compileProgn(node){
    const sequence = node.nodes.map(compile)
    return `(${sequence.join(', ')})`
}

function compileApplication(node){
    let operator = format(compile(node.operator))
    let operands = node.operands.map(compile)
    operands =  operands.map(o => typeof o === 'object' ? JSON.stringify(o) : o)
    console.log('lambda operands ->', operands.join(','))
    //@TODO JSON.stringify?
    return `${operator}(${operands.join(',')})`
}

function compilePrimitive(primitive){
    return primitive[1].toString()
}

function createCompilationPrefix(){
    let output = ''
    for(let primitive of primitives){
        output += compilePrimitive(primitive) + ';\n'
    }
    return output
}

module.exports = { compile, createCompilationPrefix }
