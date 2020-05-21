const { createEnvironment, defineVariable } = require('./environment')
const primitives = require('./primitives')
const { evaluate } = require('./interpreter')
const { read, InputStream } = require('./reader')
const readline = require("readline")
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const quit = false
function prompt(question){
    return new Promise((resolve, reject) => {
        rl.question(question, input => {
            if(input === 'q') quit = true
            resolve(input)
        })
    })
}

function createGlobalEnvironment(){
    const env = createEnvironment()
    for(let primitive of primitives){
        defineVariable(primitive[0], primitive[1], env)
    }
    defineVariable('console', console, env)
    return env
}

async function launch(){
    const env = createGlobalEnvironment()

    while(!quit){
        try{
            const input = await prompt('> ')
            const result = evaluate(read(InputStream(input)), env)
            console.log(result)
        } catch(err){
            console.log(err)
        }
    }
    rl.close()
}

launch()
