const router = new VueRouter({
  routes: [
    {
      path: '/',
      redirect: '/visits',
      name: 'Periscope'
    },
    {
      path: '/visits',
      component: httpVueLoader('/pages/visits.vue'),
      name: 'Periscope - visits'
    },
    {
      path: '/visit/:id',
      component: httpVueLoader('/pages/visit.vue'),
      name: 'Periscope - view visit'
    },
    {
      path: '/targets',
      component: httpVueLoader('/pages/targets.vue'),
      name: 'Periscope - targets'
    },
    {
      path: '/targets/:id',
      component: httpVueLoader('/pages/target-visits.vue'),
      name: 'Periscope - visits to target'
    },
    {
      path: '/search',
      component: httpVueLoader('/pages/search.vue'),
      name: 'Periscope - search results'
    }
  ]
});