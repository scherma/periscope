<template>
<b-container fluid>
  <login v-bind:display="show_login" @auth="authSuccess"></login>
  <new-target v-if="permissions.can_submit || logged_in" v-bind:logged_in="logged_in">
  </new-target>
  <b-row id="top-nav" class="pagenav" v-if="permissions.can_view">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="page"></b-pagination-nav>
    </b-col>
  </b-row>
  <b-container fluid v-if="permissions.can_view">
    <b-row class="target-row" v-for="target in targets" :key="target.target_id">
      <b-col class="longdata mt-2 mb-2" lg="10">
        <b-row>
          <b-col><router-link :to="'/targets/' + target.target_id">{{target.query}}</router-link></b-col>
        </b-row>
        <b-row>
          <b-col class="datetext">Created: {{moment(target.createtime).format("YYYY-MM-DD HH:mm:ss")}} - Visits: {{target.count}}
            <span v-if="target.private"> - <b-icon-eye-slash></b-icon-eye-slash></span>
          </b-col>
        </b-row>
      </b-col>
      <b-col lg="2" class="mt-2 mb-2">
        <b-row class="h-100" align-v="center">
          <b-col>
            <re-run :target_id="target.target_id" :target_url="target.query" right @visit-rerun="loadVisit" v-if="permissions.can_submit"></re-run>
          </b-col>
        </b-row>
      </b-col>
    </b-row>
  </b-container>
  <b-row id="bottom-nav" class="pagenav" v-if="permissions.can_view">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="page"></b-pagination-nav>
    </b-col>
  </b-row>
</b-container>
</template>

<style scoped>
.target-row {
  padding: 10px 0 10px 0;
}
.target-row:nth-child(odd) {
  background-color: var(--white);
  border-radius: .25rem;
}

.pagenav {
  padding: 10px 0 10px 0;
}
</style>

<script>
module.exports = {
  props: {
    permissions: Object,
    user: Object
  },
  data: function() {
    return {
      title: "Targets",
      page: 1,
      targets: null,
      url: null,
      pagination: {
        from: null,
        to: null,
        lastPage: null,
        perPage: null,
        currentPage: 1
      },
      logged_in: false,
      show_login: false
    };
  },
  methods: {
    fetchTargets: async function () {
      axios({
        method: "get",
        url: `/targets?page=${this.page}`,
      }).then((result) => {
        this.targets = result.data.data;
        this.pagination = result.data.pagination;
        this.show_login = false;
      }).catch((err) => {
        this.targets = null;
        this.pagination = {from: null, to: null, lastPage: null, perPage: null, currentPage: 1};
        if (err.response.status == 401) {
          this.logged_in = false;
          this.show_login = true;
        } else {
          this.$bvToast.toast(err.message, {
            noAutoHide: true,
            variant: 'danger',
            toaster: 'b-toaster-bottom-center'
          });
        }
      });
    },
    loadVisit: function(visit_id) {
      router.push(`/visit/${visit_id}`);
    },
    noop () {
    },
    linkGen(pageNum) {
      return {
        path: '/targets',
        query: { page: pageNum }
      }
    },
    pageGen() {
      return this.page;
    },
    authSuccess() {
      this.fetchTargets();
      this.$emit('auth', 'success');
    }
  },
  computed: {
  },
  beforeMount: function () {
    this.fetchTargets();
  },
  beforeRouteUpdate(to, from, next) {
    this.page = to.query.page;
    this.fetchTargets();
    next();
  },
  components: {
    "new-target": httpVueLoader("/pages/components/new-target.vue"),
    "re-run": httpVueLoader("/pages/components/re-run-target.vue"),
    login: httpVueLoader("/pages/components/login-card.vue")
  }
}
</script>