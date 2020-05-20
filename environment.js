const primitives = require('./primitives')

function Environment(parent){
    this.vars = Object.create(parent ? parent.vars : null)
    this.parent = parent
}

Environment.prototype = {
    extend: function(){
        return new Environment(this)
    },
    lookup: function(name){
        if(name in this.vars) return this.vars[name]
        throw new Error(`Undefined variable ${name}`)
    },
    set: function(name, value){
        if(name in this.vars) return this.vars[name] = value
        throw new Error(`Can't set undefined variable ${name}`)
    },
    define: function(name, value){
        return this.vars[name] = value
    }
}

const createEnvironment = parent => new Environment(parent)
const extendEnvironment = (env) => env.extend()
const lookupVariable = (name, env) => env.lookup(name)
const setVariable = (name, value, env) => env.set(name, value)
const defineVariable = (name, value, env) => env.define(name, value)
const defineVariables = (names, values, env) => {
    for(let i = 0; i < names.length ; i++){
        env.define(names[i], values[i], env)
    }
}

function createGlobalEnvironment(){
    const env = createEnvironment()
    for(let primitive of primitives){
        defineVariable(primitive[0], primitive[1], env)
    }
    return env
}

module.exports = {
    createEnvironment,
    createGlobalEnvironment,
    lookupVariable,
    setVariable,
    defineVariable,
    defineVariables,
    extendEnvironment
}
