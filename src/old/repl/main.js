const { createEnvironment, defineVariable } = require('../environment')
const primitives = require('../primitives')
const { compile } = require('../compiler')
const { parse } = require('../parser')
const { read, InputStream } = require('../reader')

function createGlobalEnvironment(){
    const windowEnv = {vars: window}
    const env = createEnvironment(windowEnv)
    for(let primitive of primitives){
        defineVariable(primitive[0], primitive[1], env)
    }
    defineVariable('console', console, env)
    return env
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

async function launch(){
    const env = createGlobalEnvironment()
    console.log('[*] Launching repl')

    const prefix = createCompilationPrefix()
    eval(prefix)

    const socket = new WebSocket('ws://localhost:8080');
    socket.addEventListener('message', function (event) {
        const ast = parse(read(InputStream(event.data)))
        eval(compile(ast, env))
    })
}

launch()
