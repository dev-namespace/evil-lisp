const { recursiveMap } = require('./utils')

let listOverridesPending = 0

function readWhile(input, func){
    let token = ""
    while(func(input.peek())){
        token += input.next()
    }
    return token
}

function unread(exp){
    let result = ""
    for(let token of exp){
        if(Array.isArray(token)){
            result += '('
            result += unread(token)
            result += ')'
        }
        else result += token + ' '
    }
    return result
}

function readList(input){
        let tokens = []
        let openLists = input.getDelimited('(')
        input.next()
        while(!input.eof() && !(input.getDelimited('(') === openLists && input.peekPrev() === ')')){
            if(input.peekPrev() === '(') input.openDelimited('(')
            let token = read(input)
            if(listOverridesPending > 0){
                listOverridesPending--
                tokens = token
            } else {
                if(token) tokens.push(token)
            }
            if(input.peekPrev() === ')') input.closeDelimited('(')
        }
        input.next()
        return tokens
}

const macroCharacters = {
    '"': input => {
        input.next()
        let token = readWhile(input, char => char !== '"')
        // console.log('string token',  `"${token}"`)
        input.next()
        return `"${token}"`
    },
    ".": input => {
        input.next()
        let token = readWhile(input, char => !isWhitespace(char) && !isTerminatingMacro(char))

        // simple . operator
        console.log('token:', token)
        if(token === ""){
            return '.'
        }

        // advanced . operator
        const tokens = readList(input)
        listOverridesPending++
        return ['.', ['quote', token], ...tokens]
    },
    "'": input => {
        input.next()
        return ['quote', read(input)]
    },
    "`": input => {
        input.next()
        let tokens = read(input)
        // console.log('TOKENS:', tokens)
        tokens = recursiveMap(token => {
            if(token[0] === '~'){
                return ['unquote', token.slice(1)]
            }
            return token
        }, tokens)
        // console.log('SPLICEd:', ['syntaxquote', tokens])
        return ['syntaxquote', tokens]
    },
    ":": input => { // keywords are just symbols, @TODO make them functions
        input.next()
        return ['quote', read(input)]
    },
    "#": input => {
        input.next()
        let args = []
        const tokens = read(input)
        tokens.forEach((token, i) => {
            if(token.includes('%')){
                const arg = token.replace('%', 'arg')
                tokens[i] = arg
                args.push(arg)
            }
        })
        return ['lambda', args, tokens]
    },
    "(": readList,
    ")": input => {
        input.next()
    }
}

function read(input){
    while(!input.eof()){
        let char = input.peek()
        if(isIllegal(char)) return `illegal character at ${i}`
        if(isWhitespace(char)) {input.next(); continue}
        if(isMacro(char)) return macroFunction(char, input)
        if(isConstituent(char)){
            let token = ""
            while(!input.eof()){
                let char = input.next()
                if(isTerminatingMacro(char)) return token
                if(isWhitespace(char)) return token
                if(isIllegal(char)) return input.error('Illegal character')
                // console.log('C:', char)
                token += char
            }
            return token
        }
    }
}

function InputStream(input){
    const delimited = {} // number of open delimited expressions (eg: (), "", [])
    let pos = 0
    const next = () => input.charAt(pos++)
    const peek = () => input.charAt(pos)
    const peekPrev = () => input.charAt(pos - 1)
    const eof = () => pos >= (input.length)
    const getPos = () => pos
    const error = msg => {throw new Error(`${msg} at ${pos}`)}
    const getDelimited = char => delimited[char] || 0
    const closeDelimited = char => delimited[char]--
    const openDelimited = char => {
        delimited[char] = delimited[char] || 0
        delimited[char]++
    }
    return {next, peek, peekPrev, getPos, eof, error, getDelimited, closeDelimited, openDelimited}
}


function macroFunction(char, input){
    return macroCharacters[char](input)
}

function isMacro(char){
    return macroCharacters.hasOwnProperty(char)
}

function isTerminatingMacro(char){
    return char === '(' || char === ')'
}

function isWhitespace(char){
    return char === ' ' || char === '\t'
}

function isConstituent(char){
    return !isMacro(char)
}

function isIllegal(char){
    return false
}


module.exports = { InputStream, read, unread}
