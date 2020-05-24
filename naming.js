
const substitutions = {
    '+': 'add',
    '-': 'sub',
    '>': 'gt',
    '<': 'lt',
}

function format(name){
    return substitutions[name] || name
}

module.exports = { format }
