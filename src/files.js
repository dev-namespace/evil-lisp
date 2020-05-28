const { parse } = require('./parser')
const { read, InputStream } = require('./reader')

const fs = require('fs')

function parseFile(path){
    //@TODO test .js, .evl, etc.
    let content = fs.readFileSync(path).toString()
    content = content.replace(/;.*/g, "")
    content = content.replace(/\r\n/g, " ")
    content = content.replace(/\n/g, " ")
    const input = `(progn ${content})`
    return parse(read(InputStream(input)))
}

module.exports = { parseFile }
