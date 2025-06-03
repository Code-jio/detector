const path = require('path');

const AutoImport = require('unplugin-auto-import/webpack');
const Components = require('unplugin-vue-components/webpack');
const {
  ElementPlusResolver
} = require('unplugin-vue-components/resolvers');

const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
  VueLoaderPlugin
} = require('vue-loader');
const {
  DefinePlugin
} = require('webpack');

// 返回处理样式的loader函数
const getStyleLoader = (pre) => {
  return [
    'vue-style-loader',
    'css-loader',
    {
      // 处理css兼容性问题
      // 配合package.json中的browerslist指定兼容性
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: ['postcss-preset-env'],
        },
      },
    },
    pre,
  ].filter(Boolean); // filter(Boolean) 过滤掉undefined值
};

module.exports = {
  entry: './src/main.js',
  output: {
    path: undefined,
    filename: 'static/js/[name].js',
    chunkFilename: 'static/js/[name].chunk.js',
    assetModuleFilename: 'static/media/[hash:10][query]',
  },
  module: {
    rules: [
      // 处理css
      {
        test: /\.css$/,
        use: getStyleLoader(),
      },
      {
        test: /\.less$/,
        use: getStyleLoader('less-loader'),
      },
      {
        test: /\.s[ac]ss$/,
        use: getStyleLoader('sass-loader'),
      },
      {
        test: /\.styl$/,
        use: getStyleLoader('stylus-loader'),
      },
      // 处理图片
      {
        test: /\.(jpe?g|png|gif|webp|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
      },
      // 处理其他资源
      {
        test: /\.(woff2?|ttf)$/,
        type: 'asset/resource',
      },
      // 处理js
      {
        test: /\.jsx?$/,
        include: path.resolve(__dirname, '../src'),
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          cacheCompression: false,
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      // 处理 gltf/glb 3D模型
      {
        test: /\.(gltf|glb)$/,
        // loader: 'url-loader',
        // options: {
        //   limit: 10000,
        //   name: 'models/[name].[hash:7].[ext]', //
        //   // 输出文件位置：  assets/models/文件
        //   outputPath: 'assets/models',
        // },
        use: [{
          loader: 'file-loader',
          options: {
            outputPath: 'assets/models/',
          },
        }, ],
      },
    ],
  },
  // 处理HTML
  plugins: [
    new ESLintWebpackPlugin({
      context: path.resolve(__dirname, '../src'),
      cache: true,
      cacheLocation: path.resolve(
        __dirname,
        '../node_modules/.cache/.eslintcache'
      ),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../public/index.html'),
    }),
    new VueLoaderPlugin(),
    // cross-env 定义的环境变量给webpack使用
    // DefinedPlugin 定义环境变量给源代码使用，从而解决vue3页面报警告问题
    new DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  mode: 'development',
  devtool: 'cheap-module-source-map',
  stats: 'errors-warnings', // 只显示错误和警告
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    runtimeChunk: {
      name: (entrypoint) => `runtime~${entrypoint.name}.js`,
    },
  },
  // webpack解析模块加载选项
  resolve: {
    // 自动补全文件扩展名
    extensions: ['.vue', '.js', '.json'],
    // 配置别名
    alias: {
      '@': path.resolve(__dirname, '../src'),
      vue$: 'vue/dist/vue.runtime.esm-bundler.js',
    },
  },
  devServer: {
    host: '0.0.0.0', // 允许外部访问
    port: 3000,
    open: false, 
    hot: true, 
    historyApiFallback: true, 
    server: 'https', 
    allowedHosts: 'all',
    client: {
      logging: 'error', // 只显示错误
      progress: true, // 禁用进度条
      overlay: {
        errors: true,
        warnings: false
      }
    },
    setupMiddlewares: (middlewares, devServer) => {
      // 自定义启动信息
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // 在服务器启动后显示访问信息
      devServer.compiler.hooks.done.tap('ShowAccessInfo', () => {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        const localIPs = [];

        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
              localIPs.push(net.address);
            }
          }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🚀 VR开发服务器已启动！');
        console.log('='.repeat(60));
        console.log('\n📍 访问地址:');
        console.log(`   本地访问: https://localhost:3000`);
        
        if (localIPs.length > 0) {
          localIPs.forEach(ip => {
            console.log(`   局域网访问: https://${ip}:3000`);
          });
        }
        
        console.log('\n🎯 VR场景地址:');
        console.log(`   本地: https://localhost:3000/#/webxr-test`);
        
        if (localIPs.length > 0) {
          localIPs.forEach(ip => {
            console.log(`   局域网: https://${ip}:3000/#/webxr-test`);
          });
        }
        
        console.log('\n💡 使用提示:');
        console.log('   • VR设备请使用局域网地址访问');
        console.log('   • 首次访问会有证书警告，选择继续即可');
        console.log('   • WebXR需要HTTPS环境');
        console.log('   • 按 Ctrl+C 停止服务器');
        console.log('\n' + '='.repeat(60) + '\n');
      });

      return middlewares;
    },
  },
};