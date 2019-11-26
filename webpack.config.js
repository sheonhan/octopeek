const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        popup: path.join(__dirname, 'popup.ts'),
        background: path.join(__dirname, 'background.ts'),
        content: path.join(__dirname, 'content.ts')
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                from: 'manifest.json',
                to: 'manifest.json'
            },
            {
                from: 'numbers.png',
                to: 'numbers.png'
            },
            {
                from: 'popup.html',
                to: 'popup.html'
            }
        ])
    ]
};
