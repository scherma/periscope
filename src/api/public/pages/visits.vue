<template>
<b-container fluid>
  <new-target>
  </new-target>
  <b-row id="top-nav" class="pagenav">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="page"></b-pagination-nav>
    </b-col>
  </b-row>
  <b-container fluid>
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
      </b-col>
      <b-col lg="6" class="imgcol">
        <div class="img-wrapper">
          <b-img :src="`/visits/${visit.visit_id}/thumbnail`" class="thumbnail"></b-img>
        </div>
      </b-col>
    </b-row>
  </b-container>
  <b-row id="bottom-nav" class="pagenav">
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
    }
  },
  methods: {
    fetchVisits: async function () {
      let data = await axios({
        method: "get",
        url: `/visits?page=${this.page}`,
      });
      this.visits = data.data.data;
      this.pagination = data.data.pagination;
    },
    linkGen(pageNum) {
      return {
        path: '/visits',
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