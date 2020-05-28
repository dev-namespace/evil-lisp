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

module.exports = { isSurroundedBy, recursiveMap }
