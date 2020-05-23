const router = new VueRouter({
  routes: [
    {
      path: '/',
      redirect: '/visits'
    },
    {
      path: '/visits',
      component: httpVueLoader('/pages/visits.vue')
    },
    {
      path: '/visit/:id',
      component: httpVueLoader('/pages/visit.vue')
    },
    {
      path: '/targets',
      component: httpVueLoader('/pages/targets.vue')
    },
    {
      path: '/targets/:id',
      component: httpVueLoader('/pages/target-visits.vue')
    }
  ]
});