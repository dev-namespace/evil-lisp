const { compile, createCompilationPrefix } = require('./compiler')
const { parse } = require('./parser')
const { read, InputStream } = require('./reader')
const fs = require('fs')

// function pprint(msg){
//     console.log(JSON.stringify(msg, null, 2))
// }

const path = process.argv[2]
let content = fs.readFileSync(path).toString()
content = content.replace(/;.*/g, "")
content = content.replace(/\r\n/g, " ")
content = content.replace(/\n/g, " ")
const input = `(progn ${content})`

const ast = parse(read(InputStream(input)))
const compilation = createCompilationPrefix() + compile(ast)
console.log(`(function(){${compilation}}())`)
console.log('=================================')
console.time('eval')
eval(`(function(){${compilation}}())`) //@TODO where to put this
console.timeEnd('eval')
