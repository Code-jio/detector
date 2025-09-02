const path = require('path');
const os = require('os');

// 禁用Sass的Legacy JS API警告
process.env.SASS_SILENCE_DEPRECATIONS = '1';

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
    pre && (pre === 'sass-loader' ? {
      loader: 'sass-loader',
      options: {
        // 避免Legacy JS API警告的配置
        implementation: require('sass'),
        sourceMap: false,
        additionalData: `$silence-deprecations: true;`,
        sassOptions: {
          // 禁用所有警告和弃用提示
          quietDeps: true,
          verbose: false,
          silenceDeprecations: ['legacy-js-api'],
          api: 'modern'
        }
      },
    } : pre),
  ].filter(Boolean); // filter(Boolean) 过滤掉undefined值
};

// 获取本机IP地址
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部地址和非IPv4地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
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
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      THREE: 'THREE', // 为shader-particle-engine提供全局THREE变量
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
  
  // 简化编译输出信息 (移到这里作为顶级配置)
  stats: {
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: false,        // 不显示资产信息
    chunks: false,        // 不显示代码块信息
    modules: false,       // 不显示模块信息
    reasons: false,       // 不显示模块被包含的原因
    children: false,      // 不显示子编译信息
    source: false,        // 不显示源码
    errors: true,         // 显示错误
    errorDetails: true,   // 显示错误详情
    warnings: true,       // 显示警告
    publicPath: false,    // 不显示公共路径
    entrypoints: false,   // 不显示入口点信息
  },
  
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
    // 使用 '0.0.0.0' 绑定所有网络接口，或者动态获取IP
    host: '0.0.0.0',
    port: 'auto',
    open: [
      `http://localhost:3002`,
      `http://${getLocalIpAddress()}:3002`
    ],
    hot: true,
    historyApiFallback: true, // 解决react-router刷新
    // 允许外部访问
    allowedHosts: 'all',
    // 自动检测可用端口
    // port: 'auto',
    
    client: {
      // 在控制台显示本机访问地址
      logging: 'warn', // 只显示警告和错误，不显示信息级别的日志
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    
    // 启动后在控制台显示所有可访问的地址
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      
      const port = devServer.server.address().port;
      const localIp = getLocalIpAddress();
      
      console.log('\n项目启动成功！可通过以下地址访问：');
      console.log(`- Local access: http://localhost:${port}`);
      console.log(`- LAN access: http://${localIp}:${port}`);
      console.log(`- External access: http://0.0.0.0:${port}\n`);
    },
  },
  
  // 控制基础设施日志输出
  infrastructureLogging: {
    level: 'warn', // 只显示警告和错误级别的基础设施日志
  },
};