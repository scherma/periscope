<template>
  <div>
    <b-modal size="xl" id="re-run-modal" title="Re-run target" v-model="displayForm" hide-footer>
      <b-form id="re-run-form">
        <b-row id="re-run-row">
          <b-col md="10">
            {{ target_url }}
          </b-col>
          <b-col md="2">
            <b-row>
              <b-col class="col-6 go-left pr-1">
                <b-button type="submit" variant="secondary" class="go w-100" @click.stop.prevent="submit()">Go</b-button>
              </b-col>
              <b-col class="col-6 go-right pl-1">
                <b-button variant="outline-dark" 
                  :aria-expanded="showOptions ? 'true' : 'false'" 
                  :class="showOptions ? null : 'collapsed'" 
                  aria-controls="collapse-log"
                  @click="showOptions = !showOptions" class="go w-100 showOptions"><b-icon-gear></b-icon-gear></b-button>
              </b-col>
            </b-row>
          </b-col>
        </b-row>
        <b-row>
          <b-col>&nbsp;</b-col>
        </b-row>
        <b-collapse id="collapse-log" v-model="showOptions">
          <b-row>
            <b-col md="2" class="font-weight-bold">Referrer</b-col>
            <b-col md="10"><b-input name="referrer" type="text" v-model="form.referrer"></b-input></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Select device</b-col>
            <b-col md="10">
              <b-form-select v-model="selectedDevice" :options="devices" @change="fetchOptions"></b-form-select>
            </b-col>
          </b-row>
          <b-row>
            <b-col>&nbsp;</b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Last device used</b-col>
            <b-col md="10">{{lastDeviceName}}</b-col>
          </b-row>
          <b-row>
            <b-col>&nbsp;</b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">User Agent</b-col>
            <b-col md="10"><b-input name="userAgent" type="text" v-model="form.device.userAgent"></b-input></b-col>
          </b-row>
          <b-row>
            <b-col>&nbsp;</b-col>
          </b-row>
          <b-row>
            <b-col class="input-spacing font-weight-bold">Viewport</b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Width</b-col>
            <b-col md="4"><b-form-input type="number" v-model="form.device.viewport.width" min="100" max="2560"></b-form-input></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Height</b-col>
            <b-col md="4"><b-form-input type="number" v-model="form.device.viewport.height" min="100" max="1600"></b-form-input></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Scale Factor</b-col>
            <b-col md="4"><b-form-input type="number" v-model="form.device.viewport.deviceScaleFactor" min="1" max="10" step="0.0001"></b-form-input></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Mobile</b-col>
            <b-col md="4"><b-form-checkbox v-model="form.device.viewport.isMobile" class="input-spacing"></b-form-checkbox></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Has Touch</b-col>
            <b-col md="4"><b-form-checkbox v-model="form.device.viewport.hasTouch" class="input-spacing"></b-form-checkbox></b-col>
          </b-row>
          <b-row>
            <b-col md="2" class="font-weight-bold">Landscape</b-col>
            <b-col md="4"><b-form-checkbox v-model="form.device.viewport.isLandscape" class="input-spacing"></b-form-checkbox></b-col>
          </b-row>
          <b-row v-if="logged_in">
            <b-col>&nbsp;
          </b-row>
          <b-row v-if="logged_in">
            <b-col md="2" class="font-weight-bold">Make private</b-col>
            <b-col md="4"><b-form-checkbox v-model="form.private" class="input-spacing"></b-form-checkbox></b-col>
          </b-row>
        </b-collapse>
      </b-form>
    </b-modal>
    <b-button size="sm" @click="showForm" variant="secondary" class="re-run" right><b-icon-arrow-clockwise font-scale="1.5"></b-icon-arrow-clockwise> Re-run</b-button>
  </div>
</template>

<style scoped>
button.btn.re-run {
  width: 100%;
}

.input-spacing {
  padding-top: 6px;
  padding-bottom: 6px;
}

@media (max-width: 767px) {
  .re-run {
    margin: 2px 0 2px 0 !important;
  }

  .go {
    width: 100%;
    margin: 2px 0 2px 0;
  }
}
</style>

<script>
module.exports = {
  name: 're-run-target',
  props: {
    target_id: Number,
    target_url: String,
    logged_in: Boolean
  },
  data: function() {
    return {
      form: {
        target_id: null,
        device: {
          name: null,
          userAgent: null,
          viewport: {
            width: null,
            height: null,
            deviceScaleFactor: null,
            isMobile: null,
            hasTouch: null,
            isLandscape: null
          }
        },
        referrer: "https://www.bing.com",
        private: false
      },
      lastDeviceName: null,
      devices: [],
      deviceOptions: {},
      showOptions: false,
      selectedDevice: null,
      displayForm: false
    }
  },
  methods: {
    submit: async function() {
      axios({
        method: "post",
        url: `/targets/${this.target_id}/new-visit`,
        data: this.form,
        errorHandle: false
      }).then((result) => {
        if (result && result.data && result.data.visit && result.data.visit.visit_id) {
          this.$emit('visit-rerun', result.data.visit.visit_id);
          this.displayForm = false;
        } else {
          this.$bvToast.toast(result.message, {
            title: "Error creating visit",
            variant: "danger",
            toaster: 'b-toaster-bottom-center'
          });
        }
      }).catch((error) => {
        this.$bvToast.toast(error.response.data, {
          title: "Error creating visit",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
      });
    },
    fetchDevices: async function() {
      axios({
        method: "get",
        url: "/deviceoptions"
      }).then((result) => {
        if (result) {
          this.devices = result.data;
        }
      });
    },
    fetchOptions: async function(devicename) {
      axios({
        method: "get",
        url: "/deviceoptions",
        params: {
          devname: devicename
        }
      }).then((response) => {
        let device = response.data;
        if (device) {
          this.deviceOptions = device;
          this.form.device.name = devicename;
          this.form.device.userAgent = device.userAgent;
          this.form.device.viewport = device.viewport;
        }
      })
    },
    fetchLastRun: async function() {
      axios({
        method: "get",
        url: `/targets/${this.target_id}`
      }).then((response) => {
        let lastRun = response.data.data[0];
        this.form.referrer = lastRun.referrer;
        this.form.device.userAgent = lastRun.settings.userAgent;
        this.form.device.viewport = lastRun.settings.viewport;
        this.form.device.name = lastRun.settings.name;
        this.lastDeviceName = lastRun.settings.name;
      });
    },
    showForm() {
      if (!this.displayForm) {
        this.fetchDevices();
        this.displayForm = true;
        this.fetchLastRun();
      }
    }
  },
  computed: {
  },
  beforeMount() {
    this.form.target_id = this.target_id;
  }
}
</script>