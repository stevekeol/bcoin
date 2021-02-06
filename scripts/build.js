const configs = require('./configs');
const rollup = require('rollup');

configs.forEach(async function(config) {
  const { output: outputOptions, ...inputOption } = config;
  const bundle = await rollup.rollup(inputOption);

  if (!Array.isArray(outputOptions)) {
    outputOptions = [outputOptions];
  }

  for (const outputOption of outputOptions) {
    await bundle.write(outputOption);
  }
});