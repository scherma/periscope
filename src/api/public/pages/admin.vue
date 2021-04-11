<template>
  <div id="adminwrap">
    <login v-bind:display="!(logged_in && user.roles.indexOf('admin') > -1)" @auth="authSuccess"></login>
    <b-container fluid v-if="logged_in && user.roles.indexOf('admin') > -1" class="ml-0 mr-0 w-100">
      <b-navbar class="admin-nav mb-2" variant="secondary" type="dark" toggleable="sm">
        <b-container fluid>
          <b-collapse is-nav id="admin-nav">
            <b-navbar-nav ref="admin-nav">
              <b-nav-item left @click="goToView('general')">General</b-nav-item>
              <b-nav-item @click="goToView('users')">Users</b-nav-item>
              <b-nav-item @click="goToView('create')">Create Account</b-nav-item>
            </b-navbar-nav>
          </b-collapse>
          <b-navbar-toggle target="admin-nav"></b-navbar-toggle>
        </b-container>
      </b-navbar>
      <general v-if="view == 'general'"></general>
      <users v-if="view == 'users'"></users>
      <issue-signup v-if="view == 'create'"></issue-signup>
      <create :password_must_change="true" v-if="view == 'create'"></create>
    </b-container>
  </div>
</template>

<style scoped>
</style>

<script>
module.exports = {
  props: {
    user: Object,
    logged_in: Boolean
  },
  data: function() {
    return {
      view: "general"
    }
  },
  methods: {
    authSuccess() {
      this.$emit('auth', 'success');
    },
    goToView(viewname) {
      router.push({query: {view: viewname}});
      this.view = viewname;
    }
  },
  computed: {
  },
  components: {
    general: httpVueLoader("/pages/components/admin-general.vue"),
    users: httpVueLoader("/pages/components/admin-users.vue"),
    create: httpVueLoader("/pages/components/create-account.vue"),
    login: httpVueLoader("/pages/components/login-card.vue"),
    'issue-signup': httpVueLoader("/pages/components/issue-signup.vue")
  }
}
</script>