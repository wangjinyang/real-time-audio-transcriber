const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-source-map',

    entry: {
      'service-worker': './service-worker.js',
      audio_processor_worklet: './js/audio_processor_worklet.js',
      'js/main': './js/main',
    },

    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      clean: true,
      environment: {
        module: true,
        dynamicImport: true,
      },
    },

    experiments: {
      outputModule: true,
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              passes: 2,
            },
            mangle: {
              reserved: ['chrome'],
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform(content) {
              const manifest = JSON.parse(content.toString());
              // You can modify manifest here if needed for production
              return JSON.stringify(manifest, null, isProduction ? 0 : 2);
            },
          },

          // Copy HTML files
          {
            from: 'sidepanel.html',
            to: 'sidepanel.html',
          },

          // Copy CSS files
          {
            from: 'sidepanel.css',
            to: 'sidepanel.css',
          },

          // Copy icons
          {
            from: 'icons/',
            to: 'icons/',
          },
        ],
      }),
    ],

    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'js'),
      },
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        },
      ],
    },

    stats: {
      assets: true,
      modules: false,
      chunks: false,
      chunkModules: false,
      colors: true,
      timings: true,
    },
  };
};

