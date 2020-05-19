const { evaluate } = require('./interpreter')
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
    while(!quit){
        const result = evaluate(await prompt('> '))
        console.log(result)
    }
    rl.close()
}

launch()
