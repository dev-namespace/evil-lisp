const { createGlobalEnvironment } = require('./environment')
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

async function launch(){
    const env = createGlobalEnvironment()
    while(!quit){
        const result = evaluate(read(InputStream(await prompt('> '))), env)
        console.log(result)
    }
    rl.close()
}

launch()
