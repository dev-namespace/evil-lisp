const substitutions = {
    '+': 'add',
    '-': 'sub',
    '>': 'gt',
    '<': 'lt',
    '.': 'dot',
}

function format(name){
    return substitutions[name] || name
}

module.exports = { format }
