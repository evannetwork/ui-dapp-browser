const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const argv = require('minimist')(process.argv.slice(2));

const outFolder = path.resolve(__dirname, 'dist');

const config = {
  entry: './src/index.ts',
  devtool: '#source-map',
  mode: argv.mode || 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules|dist/,
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
    new CopyWebpackPlugin([{
      flatten: true,
      from: 'src/static/*',
    }]),
    new webpack.SourceMapDevToolPlugin({
      filename: 'dapp-browser.js.map',
      exclude: ['libs'],
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'dapp-browser.js',
    path: outFolder,
  },
};

if (argv.mode === 'production') {
  config.devtool = '#source-map';
  // http://vue-loader.vuejs.org/en/workflow/production.html
  config.plugins = config.plugins.concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new TerserPlugin({
      parallel: true,
      terserOptions: {
        ecma: 6,
        output: {
          comments: false,
        },
      },
    }),
  ]);
}

module.exports = config;
