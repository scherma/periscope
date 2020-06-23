<template>
  <b-container id="visit" fluid>
    <b-modal id="screenshot" title="Screenshot" scrollable hide-footer>
      <template v-slot:modal-title>
        Visit {{visitData.visit.visit_id}} screenshot
      </template>
      <div class="d-block modal-wide">
        <b-img :src="screenshotPath" thumbnail="true">
      </div>
    </b-modal>
    <b-row class="visit-head mb-2">
      <b-col>
        <b-row class="visit-meta">
          <b-col lg="8" class="mt-2">
            <b-row>
              <b-col lg="2" class="font-weight-bold">Query</b-col><b-col lg="10" class="longdata">{{ visitData.visit.query }}</b-col>
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Target ID</b-col><b-col lg="10">{{ visitData.visit.target_id }}</b-col>
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Visit ID</b-col><b-col lg="10">{{ visitData.visit.visit_id }}</b-col>
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Created</b-col><b-col lg="10">{{ visitData.visit.createtime }}</b-col>
            </b-row>
            <b-row>
              <b-col sm="2" class="font-weight-bold">Processed</b-col><b-col lg="10">{{ visitData.visit.time_actioned }}</b-col>  
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Complete?</b-col><b-col lg="10">{{ visitData.visit.completed }}</b-col>
            </b-row>
            <b-row v-if="visitData.visit.settings">
              <b-col lg="2" class="font-weight-bold">User Agent</b-col><b-col lg="10">{{ visitData.visit.settings.userAgent }}</b-col>
            </b-row>
          </b-col>
          <b-col lg="4" class="thumb-col mt-2 mb-2">
            <a v-b-modal.screenshot v-if="visitData.visit.visit_id" center>
              <b-img center :src="'/visits/' + visitData.visit.visit_id + '/thumbnail'" class="thumbnail">
            </a>
          </b-col>
        </b-row>
        <b-navbar toggleable="md" class="pt-0 pl-0 pr-0">
          <b-navbar-toggle target="visit-options-nav"></b-navbar-toggle>
          <b-collapse is-nav id="visit-options-nav">
            <b-navbar-nav>
              <b-nav-item class="visit-nav-item-left">
                <b-button size="sm" variant="primary" v-b-toggle.collapse-headers class="visit-nav-btn">
                  <b-icon-eye font-scale="1.5"></b-icon-eye>&nbsp; See headers</b-button>
              </b-nav-item>
              <b-nav-item class="visit-nav-item-left" v-if="visitData.errors">
                <b-button size="sm" variant="secondary" v-b-toggle.collapse-errors class="visit-nav-btn">
                  <b-icon icon="exclamation-triangle" font-scale="1.5"></b-icon>&nbsp; See errors</b-button>
              </b-nav-item>
              <b-nav-item class="visit-nav-item-left" v-if="visitData.fingerprinting">
                <b-button size="sm" variant="secondary" v-b-toggle.collapse-fingerprinting class="visit-nav-btn">
                  <i class="mdi mdi-fingerprint"></i>&nbsp; See fingerprinting</b-button>
              </b-nav-item>
            </b-navbar-nav>
            <b-navbar-nav class="ml-auto">
              <b-nav-item right class="visit-nav-item-right">
                <re-run :targetID="visitData.visit.target_id" @visit-rerun="loadNewVisit"></re-run>
              </b-nav-item>
              <b-nav-item right class="visit-nav-item-right">
                <b-button size="sm" variant="secondary" :href="'/visits/' + visitData.visit.visit_id + '/allfiles'" right  class="visit-nav-btn">
                  <b-icon-arrow-bar-down font-scale="1.5"></b-icon-arrow-bar-down> Get all files</b-button>  
              </b-nav-item>
            </b-navbar-nav>
          </b-collapse>
        </b-navbar>
      </b-col>
    </b-row>
    <b-collapse id="collapse-errors" v-if="visitData.errors">
      <b-row>
        <b-alert show class="alert-lowpad">
          <h5>Errors</h5>
          <b-row v-for="error in visitData.errors" :key="error">
            <b-col class="longdata text-monospace" >{{error}}</b-col>
          </b-row>
        </b-alert>
      </b-row>
    </b-collapse>
    <b-collapse id="collapse-fingerprinting">
      <b-row class="visit-fingerprint" v-if="visitData.fingerprinting">
        <b-col>
          <b-row v-for="fingerprint in visitData.fingerprinting" :key="fingerprint.dfpm_id">
            <b-alert show :variant="fingerprint.dfpm_level" class="alert-lowpad">
              <b-row v-b-toggle="'fp-collapse-' + fingerprint.dfpm_id">
                <b-col>
                  <b-row>
                    <b-col cols="12" class="longdata"><strong>{{fingerprint.dfpm_category}} fingerprinting detected!</strong> - {{fingerprint.dfpm_path}}</b-col>
                    <b-col cols="12" class="longdata">{{fingerprint.dfpm_url}}</b-col>
                  </b-row>
                </b-col>
              </b-row>
              <b-collapse :id="'fp-collapse-' + fingerprint.dfpm_id">
                <b-row class="mt-2">
                  <b-col cols="12">
                    <b-row>
                      <b-col><strong>Stack trace</strong></b-col>
                    </b-row>
                    <b-row v-for="stackitem in fingerprint.dfpm_raw.stack" :key="stackitem">
                      <b-col>{{stackitem.fileName}} line {{stackitem.lineNumber}} col {{stackitem.columnNumber}}</b-col>
                    </b-row>
                  </b-col>
                </b-row>
              </b-collapse>
            </b-alert>
          </b-row>
        </b-col>
      </b-row>
    </b-collapse>
    <b-row class="request-row" v-for="request in visitData.results.requests" :key="request">
      <b-col>
        <b-row class="request-row-head mb-2">
          <b-col>
            <b-row>
              <b-col lg="11" class="longdata mt-2 mb-2">
                <span v-if="request.request_method" class="text-uppercase">{{request.request_method}}</span>
                {{ request.request_url }}</b-col>
              <b-col lg="1" class="align-middle mt-2 mb-2">
                <b-button variant="secondary" size="sm" class="get-file" :aria-label='"Download file for request " + request.file_id'
                  :href="'/visits/' + visitData.visit.visit_id + '/file/' + request.file_id" right>
                  <i class="material-icons md-18 align-text-top" style="font-size: 18px">arrow_downward</i></b-button>  
              </b-col>
            </b-row>
          </b-col>
        </b-row>
        <b-collapse id="collapse-headers">
          <b-row class="request-row-body">
            <b-col lg="6" class="longdata">
              <b-row v-for="request_header in request.request_headers" :key="request_header">
                <b-col v-for="(header_val, header_key) in request_header" :key="header_key">
                  <b-row>
                    <b-col md="4" class="hlabel">{{header_key}}</b-col>
                    <b-col md="8" class="htext">{{header_val}}</b-col>
                  </b-row>
                </b-col>
              </b-row>
              <b-row>&nbsp;</b-row>
              <b-row v-if="request.response_code">
                <b-col md="4" class="hlabel">HTTP status</b-col>
                <b-col md="8" class="htext">{{request.response_code}}</b-col>
              </b-row>
              <b-row v-if="request.response_size">
                <b-col md="4" class="hlabel">Response bytes</b-col>
                <b-col md="8" class="htext">{{request.response_size}}</b-col>
              </b-row>
              <b-row v-if="request.response_time">
                <b-col md="4" class="hlabel">Response time</b-col>
                <b-col md="8" class="htext">{{request.response_time}}</b-col>
              </b-row>
              <b-row>&nbsp;</b-row>
              <b-row v-if="request.request_post_data">
                <b-col md="4" class="hlabel">POST data</b-col>
                <b-col md="8" class="htext">{{request.request_post_data}}</b-col>
              </b-row>
            </b-col>
            <b-col lg="6" class="longdata">
              <b-row v-for="response_header in request.response_headers" :key="response_header">
                <b-col v-for="(header_val, header_key) in response_header" :key="header_key">
                  <b-row>
                    <b-col md="4" class="hlabel">{{header_key}}</b-col>
                    <b-col md="8" class="htext">{{header_val}}</b-col>
                  </b-row>
                </b-col>
              </b-row>
            </b-col>
          </b-row>  
        </b-collapse >
      </b-col>
    </b-row>
  </b-container>
</template>

<style scoped>
.thumb-col a {
  cursor: pointer;
  max-width: 100%;
}
.request-row {
  padding: 10px 0 10px 0;
}
.request-row:nth-child(even) {
  background-color: var(--white);
  border-radius: .25rem;
}

.visit-meta {
  padding: 10px 0 10px 0;
}

div.row.visit-head {
  background-color: var(--white);
  border-radius: .25rem;
}

.hlabel {
  font-weight: bold;
  color: #808080;
}

.htext {
  color: #808080;
}

.img-thumbnail {
  max-width: 100%;
  margin: auto;
}

.get-file {
    width: 100%;
}

li.nav-item.visit-nav-item-left a.nav-link {
  padding-left: 0;
}

li.nav-item.visit-nav-item-right a.nav-link {
  padding-right: 0;
}

div.alert.alert-lowpad {
  width: 100%;
  margin-bottom: 0.5rem;
}

@media (max-width: 767px) {
  .get-file {
    margin: 2px 0 2px 0;
  }
  button.btn.visit-nav-btn, a.btn.visit-nav-btn {
    width: 100%;
  }
  .thumb-col a {
    margin: auto;
  }
}
</style>

<script>
module.exports = {
  data: function() {
    return {
      title: "",
      visitData: {
        visit: {
          visit_id: null
        },
        results: []
      },
      showErrors: false
    }
  },
  methods: {
    fetchVisitData: async function () {
      let data = await axios({
        method: "get",
        url: "/visits/" + this.$route.params.id,
      });
      this.visitData = data.data;
      this.title = "Visit " + this.visitData.visit.visit_id;
    },
    newVisit: async function () {
      let data = await axios({
        method: "get",
        url: "/targets/" + this.visitData.visit.target_id + "/new-visit"
      });
      return data;
    },
    loadNewVisit: function(visit_id) {
      console.log("loadNewVisit called");
      router.push(`/visit/${visit_id}`);
      this.fetchVisitData();
    }
  },
  computed: {
    screenshotPath: function() {
      return '/visits/' + this.visitData.visit.visit_id + '/screenshot';
    }
  },
  beforeMount: function () {
    this.fetchVisitData();
  },
  components: {
    "re-run": httpVueLoader("/pages/components/re-run-target.vue")
  }
}
</script>