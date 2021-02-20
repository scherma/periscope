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
    <b-row class="result-row" v-for="result in results" :key="result.visit_id">
      <b-col class="longdata" lg="6">
        <b-row>
          <b-col class="mt-2 mb-2">
            <router-link :to="'/visit/' + result.visit_id">{{result.query}}</router-link>
          </b-col>
        </b-row>
        <b-row class="">
          <b-col md="3" class="hlabel">Request URL</b-col>
          <b-col md="9" class="htext">{{result.request_url}}</b-col>
        </b-row>
        <b-row>
          <b-col>
            &nbsp;
          </b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Visit {{result.visit_id}}</b-col>
          <b-col md="6" class="htext">{{result.time_actioned}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Header</b-col>
          <b-col md="9" class="htext">{{result.header_name}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Value</b-col>
          <b-col md="9" class="htext">{{result.header_value}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Found in</b-col>
          <b-col md="9" class="htext">{{result.etype}}</b-col>
        </b-row>
      </b-col>
      <b-col lg="6">
        <div class="img-wrapper">
          <img :src="'/visits/' + result.visit_id + '/thumbnail'" class="thumbnail">
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
}

.result-row {
  padding: 10px 0 10px 0;
}
.result-row:nth-child(odd) {
  background-color: var(--white);
  border-radius: .25rem;
}

.pagenav {
  padding: 10px 0 10px 0;
}

.hlabel {
  font-weight: bold;
  color: #808080;
}

.htext {
  color: #808080;
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
  data: function() {
    return {
      title: "Search",
      page: 1,
      pagesize: 20,
      results: null,
      searchTerm: null,
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
    fetchResults: async function () {
      let data = await axios({
        method: "get",
        url: `/search?page=${this.page}&q=${this.searchTerm}&pagesize=${this.pagesize}`,
      });
      this.results = data.data.data;
      this.pagination = data.data.pagination;
    },
    linkGen(pageNum) {
      return {
        path: '/search',
        query: { page: pageNum, q: this.searchTerm, pagesize: this.pagesize }
      }
    },
    pageGen() {
      return this.page;
    }
  },
  computed: {
  },
  beforeMount: function () {
    this.searchTerm = this.$route.query.q;
    this.fetchResults();
  },
  beforeRouteUpdate(to, from, next) {
    this.page = to.query.page;
    this.pagesize = to.query.pagesize;
    this.searchTerm = to.query.q;
    this.fetchResults();
    next();
  }
}
</script>