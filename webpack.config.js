const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.tsx',
    mode: 'development',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'static', to: '' }, // Adjust the source and destination paths accordingly
            ],
        }),
    ],
    performance: {
        hints: false, // or 'warning' or 'error'
        maxAssetSize: 500000, // in bytes, adjust as needed
        maxEntrypointSize: 500000, // in bytes, adjust as needed
      },
    devtool: 'source-map',
}
