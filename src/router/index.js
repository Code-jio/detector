import { createRouter, createWebHistory } from 'vue-router';

export default createRouter({
  history: createWebHistory(), // hash模式：createWebHashHistory
  routes: [
    {
      path: '/', // 默认首页
      redirect: '/home', // 重定向
    },
    {
      path: '/home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/detector',
      component: () => import('@/views/Detector.vue'),
    },
    {
      path: '/animate',
      component: () => import('@/views/Animation.vue'),
    },
    {
      path: '/shader',
      component: () => import('@/views/ShaderDemo.vue'),
    },
    {
      path: '/FirstPerson',
      component: () => import('@/views/FirstPerson.vue'),
    },
    {
      path: '/test',
      component: () => import('@/views/Test.vue'),
    },
    {
      path: '/base',
      component: () => import('@/views/BaseScene.vue'),
    },
    {
      path: '/AnimationEdit',
      component: () => import('@/views/AnimationEdit.vue'),
    },
    {
      path: '/MultipleViews',
      component: () => import('@/views/MultipleViews.vue'),
    },
    {
      path: '/compare',
      component: () => import('@/views/MultipleComparison.vue'),
    },
    {
      path: '/iframe',
      component: () => import('@/views/Iframes.vue'),
    },
  ],
});
