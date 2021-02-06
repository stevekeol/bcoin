// const babel = require('rollup-plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const { eslint } = require('rollup-plugin-eslint');
const prettier = require('rollup-plugin-prettier');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { sizeSnapshot } = require('rollup-plugin-size-snapshot');
const strip = require('@rollup/plugin-strip');
const { terser } = require('rollup-plugin-terser');

const format = 'umd';
const name = 'Bcoin';
const input = 'lib/bcoin.js';
const extensions = ['.js'];
const exclude = 'node_modules/**';
// const beautifyPlugins = [prettier({ parser: 'babel' }), sizeSnapshot()];
const minimizePlugins = [terser(), sizeSnapshot()];

const banner = `/*
* Copyright (c) 2021 Bcoin.
* @Author: stevekeol
* @Date: 2021-01-19 02:30
*/`;

module.exports = [
  {
    input,
    plugins: [
      eslint({ fix: true }),
      strip({ functions: ['startTracing', 'stopTracing'] }),
      nodeResolve({ extensions }),
      commonjs(),
      // babel({ exclude, extensions })
    ],
    output: [
      {
        name,
        banner,
        format,
        file: 'build/bcoin.js',
        // plugins: beautifyPlugins
      },
      {
        name,
        banner,
        format,
        file: 'build/bcoin.min.js',
        plugins: minimizePlugins
      }
    ]
  },
  {
    input,
    plugins: [
      eslint({ fix: true }),
      nodeResolve({ extensions }),
      commonjs(),
      // babel({ exclude, extensions })
    ],
    output: [
      {
        name,
        banner,
        format,
        file: 'build/bcoin-dev.js',
        // plugins: beautifyPlugins
      },
      {
        name,
        banner,
        format,
        file: 'build/bcoin-dev.min.js',
        plugins: minimizePlugins
      }
    ]
  }
];
