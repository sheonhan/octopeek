const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        popup: path.join(__dirname, 'popup.ts'),
        background: path.join(__dirname, + 'background.ts'),
        content_script: path.join(__dirname, 'content.ts')
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
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
    }
};
