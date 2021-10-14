import { defineConfig } from 'umi';

export default defineConfig({
  title: '人物知识图谱分析 v0',
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [{ path: '/', component: '@/pages/index' }],
  fastRefresh: {},
  publicPath: '/PersonRelationGraph/',
  base: '/PersonRelationGraph/',
  outputPath: 'docs',
});
