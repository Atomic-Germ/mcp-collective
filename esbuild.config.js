const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const path = require('node:path');
const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  plugins: [
    // 依存関係を外部化（node_modulesのパッケージをバンドルに含めない）
    nodeExternalsPlugin({
      // 動的requireを使用するパッケージをバンドルに含める
      allowList: ['node-fetch', 'fetch-blob', 'formdata-polyfill', 'data-uri-to-buffer'],
    }),
  ],
  // パスエイリアスの設定
  resolveExtensions: ['.ts', '.js', '.json'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
};

if (isWatch) {
  // 監視モード
  esbuild.context(buildOptions).then(context => {
    context.watch();
    console.log('Watching for changes...');
  });
} else {
  // 一度だけビルド
  esbuild.build(buildOptions).then(() => {
    console.log('Build complete');
  });
}
