<template>
  <b-form id="newTarget">
    <b-row id="new-target">
      <b-col md="10">
        <label class="sr-only" for="url">URL</label>
        <b-input name="url" type="text" id="url" required placeholder="Sandbox new URL" v-model="form.url" @keyboard.enter.native="submit()" autofocus></b-input>
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
        <b-col md="2" class="font-weight-bold">Select device</b-col>
        <b-col md="10">
          <b-form-select v-model="selectedDevice" :options="devices" @change="fetchOptions"></b-form-select>
        </b-col>
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
        <b-col md="4"><b-form-input type="number" v-model="form.device.viewport.deviceScaleFactor" min="1" max="10" step="0.1"></b-form-input></b-col>
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
        <b-col md="4"><b-form-checkbox v-model="form.make_private" class="input-spacing"></b-form-checkbox></b-col>
      </b-row>
    </b-collapse>
  </b-form>
</template>

<style scoped>
.input-spacing {
  padding-top: 6px;
  padding-bottom: 6px;
}

@media (max-width: 767px) {
  .go {
    width: 100%;
    margin: 2px 0 2px 0;
  }
}
</style>

<script>

module.exports = {
  props: {
    logged_in: Boolean
  },
  name: 'new-target',
  data: function() {
    return {
      form: {
        url: null,
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
        make_private: false
      },
      devices: [],
      deviceOptions: {},
      showOptions: false,
      selectedDevice: null
    }
  },
  methods: {
    submit: async function() {
      axios({
        method: "post",
        url: "/targets/add",
        data: this.form,
        errorHandle: false
      }).then((result) => {
        if (result && result.data && result.data.visit && result.data.visit.visit_id) {
          let path = `/visit/${result.data.visit.visit_id}`;
          router.push(path);
        } else {
          this.addError = true;
          this.errorMessage = result.message;
        }
      }).catch((error) => {
        this.$bvToast.toast(error.response.data, {
          title: "Error adding target",
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
    }
  },
  computed: {
  },
  beforeMount() {
    this.fetchDevices();
    this.fetchOptions("default");
  }
}
</script>