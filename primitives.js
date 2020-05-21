const { analyze, executeApplication } = require('./interpreter')


// @TODO: optimize, hardcode parameters until 5 or 6, if more use reduce
const add = (args) => {
    console.log('addargs:', args)
    return args.reduce((acc, x) => acc + x, 0)
}
const sub = (args) => args.reduce((acc, x) => acc + x, 0)
const mul = (args) => args.reduce((acc, x) => acc * x, 1)
const div = (args) => args.reduce((acc, x) => acc / x, args[0] * args[0])
const mod = ([a, b]) => a % b
const gt = ([a, b]) => a > b
const lt = ([a, b]) => a < b
const gte = ([a, b]) => a >= b
const lte = ([a, b]) => a <= b
const not = ([a]) => !a
const eq = (args) => args.reduce((acc, x) => acc === x, args[0])
const and = (args) => args.reduce((acc, x) => acc && x, true)
const or = (args) => args.reduce((acc, x) => acc || x, false)
const inc = ([a]) => a + 1
const print = (args) => console.log(...args)
const get = ([seq, accesor]) => seq[accesor]
const assoc = ([coll, k, v]) => {coll[k] = v; return coll}
const obj = () => ({ kind: 'blueprint' })
const dot = ([key, coll, ...args]) => coll[key](...args)
const map = ([proc, coll]) => coll.map(arg => executeApplication(proc, [arg]))
const primitive = (key, func) => ([key, ['primitive', func]])

const primitives = [
    primitive('+', add),
    primitive('-', sub),
    primitive('*', mul),
    primitive('/', div),
    primitive('%', mod),
    primitive('>', gt),
    primitive('<', lt),
    primitive('>=', gte),
    primitive('<=', lte),
    primitive('eq', eq),
    primitive('not', not),
    primitive('and', and),
    primitive('or', or),
    primitive('inc', inc),

    primitive('print', print),
    primitive('get', get),
    primitive('assoc', assoc),
    primitive('obj', obj),
    primitive('.', dot),
    primitive('map', map)
]


module.exports = primitives
