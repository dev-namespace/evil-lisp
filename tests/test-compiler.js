const { compileString } = require('../src/evlisp/main.js')

const fs = require('fs')

let content = fs.readFileSync('tests/test.lisp').toString()

const result = compileString(content, 'tests/test.lisp')
console.log(result)

console.log('')
console.log('====================================')
console.log('')

eval(result)
