const { executeProcedure } = require('./interpreter')

// @TODO: optimize, hardcode parameters until 5 or 6, if more use reduce
const primitive = (key, func) => ([key, ['primitive', func]])
const add = (args) => args.reduce((acc, x) => acc + x, 0)
const sub = (args) => args.reduce((acc, x) => acc - x, 0)
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
const pprint = (args) => console.log(JSON.stringify(args))
const get = ([seq, accesor]) => seq[accesor]
const assoc = ([coll, k, v]) => {coll[k] = v; return coll}
const obj = () => ({})
const list = (args) => args
const dot = ([key, coll, ...args]) => coll[key](...args)
const map = ([proc, coll]) => coll.map(arg => executeProcedure(proc, [arg]))
const filter = ([proc, coll]) => coll.filter(arg => executeProcedure(proc, [arg]))
const reduce = ([proc, coll, initial]) => coll.reduce((acc, x) => executeProcedure(proc, [acc, x]), initial)

const each = ([coll, proc, step = 1, initial = 0]) => {
    for(let i = initial; i < coll.length; i = i + step){
        executeProcedure(proc, [coll[i], i])
    }
}

const partition = ([coll, size]) => {
    coll = [...coll]
    const output = []
    while(coll.length > 0){
        output.push(coll.splice(0, size))
    }
    return output
}

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
    primitive('pprint', pprint),
    primitive('get', get),
    primitive('assoc', assoc),
    primitive('obj', obj),
    primitive('list', list),
    primitive('.', dot),
    primitive('map', map),
    primitive('filter', filter),
    primitive('reduce', reduce),
    primitive('each', each),
    primitive('partition', partition)
]


module.exports = primitives
