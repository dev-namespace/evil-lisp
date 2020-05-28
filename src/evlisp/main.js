const { compileEntry, compilePrimitivePrefix, createCompilationEnvironment } = require('../compiler')
const { parse } = require('../parser')
const { read, InputStream } = require('../reader')

function compileString(content, entryPath, opts = {}){
    // opts: noPrimitives --> doesn't include the __primitives object (eg: when using webpack)
    // opts: noImports --> leaves require as is for javascript to solve
    const env = createCompilationEnvironment()
    Object.assign(env.opts, opts)
    env.path = entryPath
    const prefix = opts.noPrimitives ? "" : compilePrimitivePrefix()
    content = content.replace(/;.*/g, "")
    content = content.replace(/\r\n/g, " ")
    content = content.replace(/\n/g, " ")
    const input = `(progn ${content})`
    const r = read(InputStream(input))
    const ast = parse(r)
    const compilation = prefix + compileEntry(ast, env)
    return compilation
}

module.exports = { compileString }
