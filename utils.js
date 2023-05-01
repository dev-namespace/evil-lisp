function isSurroundedBy(str, first, last){
    return str[0] === first || str.slice(-1) === last
}

function recursiveMap(func, array){
    let output = []
    for(let token of array){
        if(typeof token === 'object') output.push(recursiveMap(func, token))
        else output.push(func(token))
    }
    return output
}

function attempt(func){
    try {
        func()
    } catch (err) {}
}

module.exports = { isSurroundedBy, recursiveMap, attempt }
