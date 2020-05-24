const { createEnvironment, defineVariable } = require('./environment')
const primitives = require('./primitives')
const { parse } = require('./parser')
const { evaluate } = require('./evaluator')
const { read, InputStream } = require('./reader')
const fs = require('fs')

function createGlobalEnvironment(){
    const env = createEnvironment()
    for(let primitive of primitives){
        defineVariable(primitive[0], primitive[1], env)
    }
    defineVariable('console', console, env)
    return env
}

const path = process.argv[2]
let content = fs.readFileSync(path).toString()
content = content.replace(/;.*/g, "")
content = content.replace(/\r\n/g, " ")
content = content.replace(/\n/g, " ")
const input = `(progn ${content})`

const env = createGlobalEnvironment()

const ast = parse(read(InputStream(input)), env)
evaluate(ast, env)
