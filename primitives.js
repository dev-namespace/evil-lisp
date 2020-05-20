
const primitives = [
    ['+', (a, b) => a + b], // @TODO hardcodeado&map
    ['-', (a, b) => a - b],
    ['*', (a, b) => a * b],
    ['/', (a, b) => a / b],
    ['%', (a, b) => a % b],
    ['<', (a, b) => a < b],
    ['>', (a, b) => a > b],
    ['<=', (a, b) => a <= b],
    ['>=', (a, b) => a >= b],
    ['eq', (a, b) => a === b],
    ['not', (a) => !a],
    ['and', (a, b) => a && b],
    ['or', (a, b) => a || b],

    // derived
]

module.exports = primitives
