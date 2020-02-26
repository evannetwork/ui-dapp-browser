const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const outFolder = path.resolve(__dirname, 'dist');

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        flatten: true,
        from: 'src/static/*',
      }
    ])
  ],
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'dapp-browser.js',
    path: outFolder,
  },
};
