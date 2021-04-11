<template>
<b-container fluid>
  <new-target v-if="permissions.can_submit">
  </new-target>
  <b-row id="top-nav" class="pagenav" v-if="permissions.can_view">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="page"></b-pagination-nav>
    </b-col>
  </b-row>
  <b-container fluid v-if="permissions.can_view">
    <b-row class="visit-row" v-for="visit in visits" :key="visit.visit_id">
      <b-col class="longdata mt-2 mb-2" lg="6">
        <b-row>
          <b-col><router-link :to="'/visit/' + visit.visit_id">{{visit.query}}</router-link></b-col>
        </b-row>
        <b-row>
          <b-col class="datetext">{{moment(visit.time_actioned).format("YYYY-MM-DD HH:mm:ss")}}</b-col>
        </b-row>
        <b-row>
          <b-col class="datetext">Status: <span :class="visit.status">{{ visit.status }}</span></b-col>
        </b-row>
      </b-col>
      <b-col class="mt-2 mb-2" lg="6">
        <div class="img-wrapper">
          <img :src="'/visits/' + visit.visit_id + '/thumbnail'" class="thumbnail">
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
.visit-row {
  padding: 10px 0 10px 0;
}
.visit-row:nth-child(odd) {
  background-color: var(--gray);
}

.pagenav {
  padding: 10px 0 10px 0;
}

.img-wrapper {
  max-width: 100%;
}

@media (max-width: 975px) {
  .img-wrapper {
    display: block;
  }

  img.thumbnail {
    margin: 10px auto 5px auto;
  }
}
</style>

<script>
module.exports = {
  props: {
    user: Object,
    permissions: Object
  },
  data: function() {
    return {
      title: "Visits for target" + this.$route.params.id,
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
    }
  },
  methods: {
    fetchVisits: async function () {
      axios({
        method: "get",
        url: `/targets/${this.$route.params.id}?page=${this.page}`,
      }).then((data) => {
        this.visits = data.data.data;
        this.pagination = data.data.pagination;
      }).catch((error) => {
        this.visits = null;
        this.pagination = {from: null, to: null, lastPage: null, perPage: null, currentPage: 1};
        this.$bvToast.toast(error.message, {
            noAutoHide: true,
          variant: 'danger',
          toaster: 'b-toaster-bottom-center'
        });
      });
    },
    linkGen(pageNum) {
      return {
        path: `/targets/${this.$route.params.id}`,
        query: { page: pageNum }
      }
    },
    pageGen() {
      return this.page;
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
    "new-target": httpVueLoader("/pages/components/new-target.vue")
  }
}
</script>