const { createGlobalEnvironment } = require('./environment')
const { evaluate } = require('./interpreter')
const { read, InputStream } = require('./reader')
const fs = require('fs')

const path = process.argv[2]
let content = fs.readFileSync(path).toString()
content = content.replace(/\r\n/g, " ")
content = content.replace(/\n/g, " ")

const input = `(progn ${content})`
console.log(input)

const env = createGlobalEnvironment()
evaluate(read(InputStream(input)), env)
