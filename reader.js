// @TODO sexpression prefixes like ', #, etc.

const prefixes = ["'", "#", "`", "~"]

function read(syntax){
    const parsed = tokenize(syntax)
    if(typeof parsed === 'object'){
        for(let i = 0; i < parsed.length; i++){
            parsed[i]  = transformations(parsed[i])
        }
        return parsed
    }
    return transformations(parsed)
}

function transformations(exp){
    if(exp[0] === "'") return `(quote ${exp.slice(1)})`
    return exp
}

function tokenize(exp){
    if(exp[0] !== '(') return exp
    const str = exp.slice(1, -1).replace(/\s+/g,' ')
    const tokens = []

    let i = 0
    let nexti = 0
    while(i < str.length){
        if(str[i] === '(' || prefixes.includes(str[i])){
            nexti = indexOfDelimiter(str, i, ')') + 1
            tokens.push(str.slice(i, nexti))
            i = nexti
        } else if(str[i] !== ' ') {
            nexti = str.indexOf(' ', i)
            nexti = nexti >= 0 ? nexti : str.length
            tokens.push(str.slice(i, nexti))
            i = nexti
        }
        i++
    }

    return tokens
}

function indexOfDelimiter(str, index, right){
    let pending = 0
    const left = str[index]
    for(let i = index + 1; i < str.length; i++){
        if(str[i] === left) pending++
        else if(str[i] === right){
            if(--pending < 0) return i
        }
    }
    return undefined
}

module.exports = { tokenize, read }
