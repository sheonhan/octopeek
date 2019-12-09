const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "production",
    entry: {
        background: path.join(__dirname, "src", "background.ts"),
        content: path.join(__dirname, "src", "content.ts"),
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    "css-loader", "style-loader",
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                from: "manifest.json",
                to: "manifest.json",
            },
            {
                from: "assets/text.png",
                to: "text.png",
            },
            {
                from: "assets/emoji.png",
                to: "emoji.png",
            },
            {
                from: "assets/numbers.png",
                to: "numbers.png",
            },
        ]),
    ],
};
