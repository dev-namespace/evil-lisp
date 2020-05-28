const WebSocket = require('ws')
const readline = require("readline")

console.log('[*] Launching nrepl')

function createReader(){
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
}

function prompt(question, reader){
    return new Promise((resolve, reject) => {
        reader.question(question, input => {
            resolve(input)
        })

        reader.on('close', () => {
            resolve()
        })
    })
}

const server = new WebSocket.Server({ port: 8080 })

server.on('connection', async ws => {
    console.log('[*] Client connected')
    const reader = createReader()
    let closed = false

    ws.on('close', () => {
        closed = true
        console.log('[Client disconnected]')
        reader.close()
    })

    while(!closed){
        const input = await prompt('> ', reader)
        if(closed) continue;
        ws.send(input)
    }

})
