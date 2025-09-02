import {
  createRouter,
  createWebHistory
} from 'vue-router';

export default createRouter({
  history: createWebHistory(), // hash模式：createWebHashHistory
  routes: [
    {
      path: '/',
      redirect: '/Fountain',
    },
    {
      path: '/home',
      component: () =>
        import('@/views/Home.vue'),
    },
    {
      path: '/detector',
      component: () =>
        import('@/views/Detector.vue'),
    },
    {
      path: '/animate',
      component: () =>
        import('@/views/Animation.vue'),
    },
    {
      path: '/shader',
      component: () =>
        import('@/views/ShaderDemo.vue'),
    },
    {
      path: '/test',
      component: () =>
        import('@/views/Test.vue'),
    },
    {
      path: '/base',
      component: () =>
        import('@/views/BaseScene.vue'),
    },
    {
      path: '/quarternion',
      component: () =>
        import('@/views/Quarternion.vue'),
    },
    {
      path: '/modelView',
      component: () =>
        import('@/views/ModelView.vue'),
    },
    {
      path: '/Cloud',
      component: () =>
        import('@/views/Cloud.vue'),
    },
    {
      path: "/Partical",
      component: () =>
        import('@/views/Partical.vue'),
    },
    {
      path: "/Fire",
      component: () =>
        import('@/views/Fire.vue'),
    },
    {
      path: "/Smoke",
      component: () =>
        import('@/views/Smoke.vue'),
    },
    {
      path: "/Spark",
      component: () =>
        import('@/views/Spark.vue'),
    },
    {
      path: "/Fountain",
      component: () =>
        import('@/views/Fountain.vue'),
    },
  ],
});