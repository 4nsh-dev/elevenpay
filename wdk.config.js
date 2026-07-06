/** Official WDK worklet bundler config.
 *
 * `@tetherto/wdk-worklet-bundler generate --install` should produce the native
 * worklet bundle once the published CLI package exposes its dist entrypoint.
 */
module.exports = {
  networks: {
    'ethereum-sepolia': { package: '@tetherto/wdk-wallet-evm' },
  },
  output: {
    bundle: './.wdk-bundle/wdk-worklet.bundle.js',
    types: './.wdk/index.d.ts',
  },
};
