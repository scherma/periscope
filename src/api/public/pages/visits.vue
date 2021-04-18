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
    <b-row class="visit-row" v-for="visit in visits" :key="visit.visit_id">
      <b-col class="longdata" lg="6">
        <b-row>
          <b-col><router-link :to="`/visit/${visit.visit_id}`">{{visit.query}}</router-link></b-col>
        </b-row>
        <b-row>
          <b-col class="datetext">{{moment(visit.time_actioned).format("YYYY-MM-DD HH:mm:ss")}}</b-col>
        </b-row>
        <b-row>
          <b-col>&nbsp;</b-col>
        </b-row>
        <b-row>
          <b-col class="datetext">Status: <span :class="visit.status">{{visit.status}}</span></b-col>
        </b-row>
        <b-row v-if="visit.private">
          <b-col class="datetext"><b-icon-eye-slash v-b-tooltip:hover title="Private submission"></b-icon-eye-slash></b-col>
        </b-row>
        <b-row v-if="visit.username">
          <b-col class="datetext">Submitted by: {{visit.username}}</b-col>
        </b-row>
      </b-col>
      <b-col lg="6" class="imgcol">
        <div class="img-wrapper">
          <b-img :src="`/visits/${visit.visit_id}/thumbnail`" class="thumbnail"></b-img>
        </div>
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
.img-wrapper {
  max-width: 100%;
  display: flex;
}

.visit-row {
  padding: 10px 0 10px 0;
}
.visit-row:nth-child(odd) {
  background-color: var(--white);
  border-radius: .25rem;
}

.pagenav {
  padding: 10px 0 10px 0;
}

@media (min-width: 992px) {
  .thumbnail {
    max-width: 200px;
    margin: 0px 0px 0px auto;
  }
}

@media (max-width: 991px) {
  .thumbnail {
    max-width: 100%;
    margin: 0px auto 0px auto;
  }
}
</style>

<script>
module.exports = {
  props: {
    logged_in: Boolean,
    user: Object,
    permissions: Object
  },
  title: "Visits",
  data: function() {
    return {
      page: 1,
      visits: null,
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
    }
  },
  methods: {
    fetchVisits: async function () {
      axios({
        method: "get",
        url: `/visits?page=${this.page}`,
      }).then((result) => {  
        this.visits = result.data.data;
        this.pagination = result.data.pagination;
        this.show_login = false;
      }).catch((err) => {
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
    linkGen(pageNum) {
      return {
        path: '/visits',
        query: { page: pageNum }
      }
    },
    pageGen() {
      return this.page;
    },
    authSuccess() {
      this.fetchVisits();
      this.$emit('auth', 'success');
    }
  },
  computed: {
  },
  beforeMount: function () {
    this.fetchVisits();
  },
  beforeRouteUpdate(to, from, next) {
    this.page = to.query.page;
    this.fetchVisits();
    next();
  },
  components: {
    "new-target": httpVueLoader("/pages/components/new-target.vue"),
    login: httpVueLoader("/pages/components/login-card.vue")
  }
}
</script>