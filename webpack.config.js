const path = require('path');
const { DuplicatesPlugin } = require('inspectpack/plugin');

module.exports = {
  entry: './src/main.ts',
  devtool: 'inline-source-map',
  mode: 'development',
  plugins: [
    new DuplicatesPlugin({
      emitErrors: false,
      verbose: false
    })
  ],
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
    extensions: [ '.tsx', '.ts', '.js' ],
    alias: {
      'pixi.js': path.resolve(__dirname, 'node_modules/pixi.js')
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};