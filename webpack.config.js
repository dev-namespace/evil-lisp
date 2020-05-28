// importamos la libreria path para manipular rutas facilmente
const path = require('path')


// webpack.config.js exporta un objeto con la configuracion
module.exports = {
    // configuracion general
    // ================================================================================================
    mode: 'development', // development | production -> especifica si se realizan o no optimizaciones
    devtool: 'source-map', // genera sourcemaps para facilitar el debugging
    entry: {
        repl: "./src/repl/main.js",
        evlisp: "./src/evlisp/main.js",
        // nrepl: "./src/backend/main.js"
    }, // determina el punto de entrada a partir del cual va deshilando los imports
    output: {
        path: path.resolve(__dirname, 'dist'), // carpeta donde pondremos la build
        filename: '[name].js', // nombre del fichero empaquetado
    },

    // configuracion modulos (loaders, parsers, etc.)
    // ================================================================================================
    module: {
        // el objeto rules contiene expresiones regulares. Si el fichero a importar cumple la expresion,
        // se utilizan los modulos especificados en esa regla
        rules: [
            {
                test: /\.(js|jsx)$/, // los ficheros .js y .jsx activan esta regla
                exclude: /node_modules/, // excepto los ficheros en node_modules
                use: {
                    loader: "babel-loader" // los ficheros seran procesados por babel
                }
            },
        ]
    },
    target: 'node'
}

// mas documentacion: https://webpack.js.org/configuration/
