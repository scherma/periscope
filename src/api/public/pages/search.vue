<template>
<b-container fluid>
  <login v-bind:display="showLogin" @auth="authSuccess"></login>
  <new-target v-if="loggedIn">
  </new-target>
  <b-row id="top-nav" class="pagenav" v-if="loggedIn">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="pagination.currentPage"></b-pagination-nav>
    </b-col>
  </b-row>
  <b-container fluid v-if="loggedIn">
    <b-row class="result-row" v-for="result in results" :key="result.visit_id">
      <b-col class="longdata" lg="6">
        <b-row>
          <b-col class="mt-2 mb-2">
            <router-link :to="'/visit/' + result.visit_id">{{result.query}}</router-link>
          </b-col>
        </b-row>
        <b-row class="">
          <b-col md="3" class="hlabel">Request URL</b-col>
          <b-col md="9" class="htext">{{result.query}}</b-col>
        </b-row>
        <b-row>
          <b-col>
            &nbsp;
          </b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Visit {{result.visit_id}}</b-col>
          <b-col md="6" class="htext">{{result.createtime}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Location</b-col>
          <b-col md="9" class="htext">{{result.loc}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Value</b-col>
          <b-col md="9" class="htext">{{result.hit}}</b-col>
        </b-row>
        <b-row>
          <b-col md="3" class="hlabel">Similarity</b-col>
          <b-col md="9" class="htext">{{result.sml}}</b-col>
        </b-row>
      </b-col>
      <b-col lg="6">
        <div class="img-wrapper">
          <img :src="'/visits/' + result.visit_id + '/thumbnail'" class="thumbnail">
        </div>
      </b-col>
    </b-row>
  </b-container>
  <b-row id="bottom-nav" class="pagenav" v-if="loggedIn">
    <b-col>
      <b-pagination-nav use-router :number-of-pages="pagination.lastPage" :link-gen="linkGen" first-number last-number :v-model="pagination.currentPage"></b-pagination-nav>
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
      results: null,
      searchTerm: null,
      pagination: {
        from: 0,
        to: null,
        lastPage: null,
        perPage: 20,
        currentPage: 1,
        total: null
      },
      loggedIn: false,
      showLogin: false
    }
  },
  methods: {
    fetchResults: async function () {
      axios({
        method: "get",
        url: `/search?page=${this.pagination.currentPage}&q=${this.searchTerm}&pagesize=${this.pagination.perPage}`,
      }).then((result) => {
        this.results = result.data.data;
        this.pagination.from = result.data.pagination.from ? result.data.pagination.from : 0;
        this.pagination.to = result.data.pagination.to ? result.data.pagination.to : this.pagination.to;
        this.pagination.currentPage = result.data.pagination.currentPage ? result.data.pagination.currentPage : this.pagination.currentPage;
        this.pagination.lastPage = result.data.pagination.lastPage ? result.data.pagination.lastPage : this.pagination.lastPage;
        this.pagination.total = result.data.pagination.total ? result.data.pagination.total : this.pagination.total;

        this.loggedIn = true;
        this.showLogin = false;
      }).catch((err) => {
        if (err.response.status == 401) {
          this.loggedIn = false;
          this.showLogin = true;
        }
      });
    },
    linkGen(pageNum) {
      return {
        path: '/search',
        query: { page: pageNum, q: this.searchTerm, pagesize: this.pagination.perPage }
      }
    },
    pageGen() {
      return this.pagination.currentPage;
    },
    authSuccess() {
      this.fetchResults();
      this.$emit('auth', 'success');
    }
  },
  computed: {
  },
  beforeMount: function () {
    this.searchTerm = this.$route.query.q;
    this.fetchResults();
  },
  beforeRouteUpdate(to, from, next) {
    this.pagination.currentPage = to.query.page ? to.query.page : this.pagination.currentPage;
    this.pagination.perPage = to.query.pagesize ? to.query.pagesize : this.pagination.perPage;
    this.searchTerm = to.query.q;
    this.fetchResults();
    next();
  },
  components: {
    login: httpVueLoader("/pages/components/login-card.vue")
  }
}
</script>