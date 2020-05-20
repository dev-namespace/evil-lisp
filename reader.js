let listOverridesPending = 0

function readWhile(input, func){
    let token = ""
    while(func(input.peek())){
        token += input.next()
    }
    return token
}

function readList(input){
        let tokens = []
        let openLists = input.getDelimited('(')
        input.next()
        while(!input.eof() && !(input.getDelimited('(') === openLists && input.peekPrev() === ')')){

            // if(isWhitespace(input.peekPrev())) {input.next(); continue}
            //open
            if(input.peekPrev() === '(') {
                input.openDelimited('(')
                // console.log('opened: ', input.getDelimited('('))
            }

            // console.log('before:', input.peekPrev())
            let token = read(input)
            if(listOverridesPending > 0){
                listOverridesPending--
                tokens = token
            } else {
                if(token) tokens.push(token)
            }
            // console.log('token:', token)
            // console.log('after:', input.peekPrev())

            // close
            if(input.peekPrev() === ')'){
                input.closeDelimited('(')
                // console.log('closed:', input.getDelimited('('))
            }
        }

        // console.log('last:', input.peekPrev())
        input.next()
        return tokens
}

const macroCharacters = {
    '"': input => {
        input.next()
        let token = readWhile(input, char => char !== '"')
        console.log('string token',  `"${token}"`)
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
    ":": input => { // keywords are just symbols, @TODO make them functions
        input.next()
        return ['quote', read(input)]
    },
    "#": input => {
        // @TODO moveOut
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
    // @TODO: peekPrev shouldn't exist
    "(": readList,
    ")": input => {
        input.next()
    }
}

//@TODO: edge case "this is a string (but won't work)" -> "should be macro
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


module.exports = { InputStream, read}
