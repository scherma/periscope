<template>
  <b-container id="visit" fluid>
    <b-modal id="screenshot" title="Screenshot" scrollable hide-footer>
      <template v-slot:modal-title>
        Visit {{visitData.visit.visit_id}} screenshot
      </template>
      <div class="d-block modal-wide">
        <b-img-lazy center
          :src="`/visits/${this.visitData.visit.visit_id}/screenshot`" 
          thumbnail="true" 
          id="visit-windowed-screenshot" 
          alt="Full screenshot for visit" 
          label="Full screenshot for visit"></b-img-lazy>
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
              <b-col lg="2" class="font-weight-bold">Status</b-col><b-col lg="10">{{ visitData.visit.status }}</b-col>
            </b-row>
            <b-row v-if="visitData.visit.settings">
              <b-col lg="2" class="font-weight-bold">User Agent</b-col><b-col lg="10">{{ visitData.visit.settings.userAgent }}</b-col>
            </b-row>
            <b-row>
              <b-col>&nbsp;</b-col>
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Raw data size</b-col><b-col lg="10">{{ visitData.results.summary.total_response_data }}</b-col>
            </b-row>
            <b-row>
              <b-col lg="2" class="font-weight-bold">Load time</b-col><b-col lg="10">{{ visitData.results.summary.total_load_time }} seconds</b-col>
            </b-row>
          </b-col>
          <b-col lg="4" class="thumb-col mt-2 mb-2">
            <a v-b-modal.screenshot v-if="visitData.visit.visit_id" id="visit-windowed-screenshot-modal" label="Windowed screenshot" label-for="visit-windowed-screenshot" center>
              <b-img  
                :src="`/visits/${this.visitData.visit.visit_id}/thumbnail?r=${this.r}`" 
                class="img-thumbnail" 
                alt="Screenshot for visit" 
                id="visit-windowed-screenshot"></b-img>
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
              <b-nav-item class="visit-nav-item-left" v-if="visitData.logdata">
                <b-button size="sm" variant="secondary" 
                  :aria-expanded="showLog ? 'true' : 'false'" 
                  :class="showLog ? null : 'collapsed'"
                  class='visit-nav-btn'
                  aria-controls="collapse-log"
                  @click="showLog = !showLog">
                  <b-icon icon="exclamation-triangle" font-scale="1.5"></b-icon>&nbsp; See log</b-button>
              </b-nav-item>
              <b-nav-item class="visit-nav-item-left" v-if="visitData.fingerprinting.length">
                <b-button size="sm" variant="secondary" v-b-toggle.collapse-fingerprinting class="visit-nav-btn">
                  <i class="mdi mdi-fingerprint"></i>&nbsp; See fingerprinting</b-button>
              </b-nav-item>
            </b-navbar-nav>
            <b-navbar-nav class="ml-auto">
              <b-nav-item right class="visit-nav-item-right">
                <re-run :targetID="visitData.visit.target_id" @visit-rerun="loadNewVisit"></re-run>
              </b-nav-item>
              <b-nav-item right class="visit-nav-item-right" :href="`/visits/${visitData.visit.visit_id}/allfiles`"> 
                <b-button size="sm" variant="secondary" right 
                  :aria-label="`Get all files for visit ${visitData.visit.visit_id}`" class="visit-nav-btn">
                  <b-icon-arrow-bar-down font-scale="1.5"></b-icon-arrow-bar-down> Get all files</b-button>  
              </b-nav-item>
            </b-navbar-nav>
          </b-collapse>
        </b-navbar>
      </b-col>
    </b-row>
    <b-collapse id="collapse-log" v-model="showLog" v-if="visitData.logdata">
      <b-row>
        <b-alert show class="alert-lowpad">
          <h5>Log entries</h5>
          <b-row v-for="log in visitData.logdata" :key="log">
            <b-col class="longdata text-monospace" >{{log}}</b-col>
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
    <b-row v-if="visitData.visit.status!='complete' && visitData.visit.status!='failed'">
      <b-col class="text-center">
        <b-spinner label="loading"></b-spinner>
      </b-col>
    </b-row>
    <b-row class="request-row" v-for="request in visitData.results.requests_sorted" :key="request">
      <b-col>
        <b-row class="request-row-head">
          <b-col>
            <b-row>
              <b-col lg="11" class="longdata mt-2 mb-2">
                <b-row>
                  <b-col><span v-if="request.request_method" class="text-uppercase">{{request.request_method}}</span>
                    {{ request.request_url }}</b-col>
                </b-row>
                <b-row><b-col class="htext">{{statusMessage(request.response_code)}}</b-col></b-row>
              </b-col>
              <b-col lg="1" class="align-middle mt-2 mb-2">
                <b-row>
                  <b-col>
                    <b-button v-if="request.file_id >= 0" variant="secondary" size="sm" class="get-file" 
                      :aria-label='"Download file for request " + request.file_id'
                      :href="`/visits/${visitData.visit.visit_id}/file/${request.file_id}`" right>
                      <i class="material-icons md-18 align-text-top" style="font-size: 18px">arrow_downward</i>
                    </b-button>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col class="htext text-center">File #{{request.file_id}}</b-col>
                </b-row>
              </b-col>
            </b-row>
          </b-col>
        </b-row>
        <b-collapse id="collapse-headers">
          <b-row class="request-row-body">
            <b-col lg="6" class="longdata">
              <b-row class="mb-6">
                <b-col class="hlabel">Request Headers</b-col>
              </b-row>
              <b-row><b-col>&nbsp;</b-col></b-row>
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
              <b-row v-if="request.response_data_length">
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
              <b-row class="mb-6">
                <b-col class="hlabel">Response Headers</b-col>
              </b-row>
              <b-row><b-col>&nbsp;</b-col></b-row>
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
  float: right;
}

.get-file {
    width: 100%;
    padding: 0;
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

@media (max-width: 992px) {
  .img-thumbnail {
    float: none !important;
    max-width: none;
    display: flex;
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
        results: {
          summary: {
            total_response_data: "",
            total_load_time: ""
          },
          requests: []
        },
        fingerprinting: []
      },
      showLog: false,
      r: 0,
      toastCount: 0,
      codes: {'100': 'Continue', '101': 'Switching Protocols', '200': 'OK', '201': 'Created', '202': 'Accepted', '203': 'Non-Authoritative Information', '204': 'No Content', '205': 'Reset Content', '206': 'Partial Content', '300': 'Multiple Choices', '301': 'Moved Permanently', '302': 'Found', '303': 'See Other', '304': 'Not Modified', '305': 'Use Proxy', '307': 'Temporary Redirect', '400': 'Bad Request', '401': 'Unauthorized', '402': 'Payment Required', '403': 'Forbidden', '404': 'Not Found', '405': 'Method Not Allowed', '406': 'Not Acceptable', '407': 'Proxy Authentication Required', '408': 'Request Timeout', '409': 'Conflict', '410': 'Gone', '411': 'Length Required', '412': 'Precondition Failed', '413': 'Payload Too Large', '414': 'URI Too Long', '415': 'Unsupported Media Type', '416': 'Range Not Satisfiable', '417': 'Expectation Failed', '418': "I'm a teapot", '426': 'Upgrade Required', '500': 'Internal Server Error', '501': 'Not Implemented', '502': 'Bad Gateway', '503': 'Service Unavailable', '504': 'Gateway Time-out', '505': 'HTTP Version Not Supported', '102': 'Processing', '207': 'Multi-Status', '226': 'IM Used', '308': 'Permanent Redirect', '422': 'Unprocessable Entity', '423': 'Locked', '424': 'Failed Dependency', '428': 'Precondition Required', '429': 'Too Many Requests', '431': 'Request Header Fields Too Large', '451': 'Unavailable For Legal Reasons', '506': 'Variant Also Negotiates', '507': 'Insufficient Storage', '511': 'Network Authentication Required'}
    }
  },
  methods: {
    fetchVisitData: async function () {
      let data = await axios({
        method: "get",
        url: `/visits/${this.$route.params.id}`,
      });
      this.visitData = data.data;
      this.title = `Visit ${this.visitData.visit.visit_id}`;

      if (this.visitData.visit.status == 'failed') {
        this.showLog = true;
      }
    },
    newVisit: async function () {
      let data = await axios({
        method: "get",
        url: `/targets/${this.visitData.visit.target_id}/new-visit`
      });
      return data;
    },
    loadNewVisit: function(visit_id) {
      console.log("loadNewVisit called");
      router.push(`/visit/${visit_id}`);
      this.fetchVisitData();
      this.joinRoom();
    },
    joinRoom: function() {
      this.$socket.emit('joinRoom', `visit/${this.$route.params.id}`);
    },
    loadThumb: async function() {
      this.r = this.r + 1;
    },
    makeToast(message, variant) {
      this.toastCount++;
      this.$bvToast.toast(message, {
        autoHideDelay: 5000,
        appendToast: true,
        variant: variant,
        name: b-toaster-top-center,
        title: level
      });
    },
    statusMessage(stat_code) {
      let msg = `${stat_code ? stat_code : ""}`
      if (stat_code && this.codes[stat_code.toString()]) {
        msg = `${msg} ${this.codes[stat_code.toString()]}`;
      }

      return msg;
    }
  },
  sockets: {
    status(data) {
      if (data == "complete") {
        this.fetchVisitData();
        this.loadThumb();
      }
    },
    dfpm_alert(data) {
      console.log(data);
      this.makeToast(`${data.category} fingerprinting detected!`, data.level)
    }
  },
  computed: {
  },
  beforeMount: function () {
    this.fetchVisitData();
    this.joinRoom();
  },
  components: {
    "re-run": httpVueLoader("/pages/components/re-run-target.vue")
  }
}
</script>