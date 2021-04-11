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
    },
    {
      path: '/account/view',
      component: httpVueLoader('/pages/account.vue'),
      name: 'Periscope - user account'
    },
    {
      path: '/admin',
      component: httpVueLoader('/pages/admin.vue'),
      name: 'Periscope - admin area'
    },
    {
      path: '/account/create',
      component: httpVueLoader('/pages/new-account.vue'),
      name: 'Periscope - create account'
    },
    {
      path: '/account/activate',
      component: httpVueLoader('/pages/activate-account.vue'),
      name: 'Periscope - account confirmation'
    },
    {
      path: '/login',
      component: httpVueLoader('/pages/login.vue'),
      name: 'Periscope - log in'
    },
    {
      path: '/account/reset-password',
      component: httpVueLoader('/pages/reset-password.vue'),
      name: 'Periscope - reset password'
    },
    {
      path: '/account/forgot-password',
      component: httpVueLoader('/pages/forgot-password.vue'),
      name: 'Periscope - request password reset'
    },
    {
      path: '/account/confirm-email',
      component: httpVueLoader('/pages/confirm-email.vue'),
      name: 'Periscope - confirm email change'
    }
  ]
});