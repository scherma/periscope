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
    <b-row class="target-row" v-for="target in targets" :key="target.target_id">
      <b-col class="longdata mt-2 mb-2" lg="10">
        <router-link :to="'/targets/' + target.target_id">{{target.query}}</router-link>
      </b-col>
      <b-col lg="2" class="mt-2 mb-2">
        <re-run :targetID="target.target_id" right @visit-rerun="loadVisit"></re-run>
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
    };
  },
  methods: {
    fetchTargets: async function () {
      let data = await axios({
        method: "get",
        url: "/targets?page=" + this.page,
      });
      this.targets = data.data.data;
      this.pagination = data.data.pagination;
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
    "re-run": httpVueLoader("/pages/components/re-run-target.vue")
  }
}
</script>