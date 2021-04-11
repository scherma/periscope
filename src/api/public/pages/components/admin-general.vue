<template>
  <b-container class="mr-0 ml-0">
    <b-row>
      <b-col lg="3" class="font-weight-bold">Public signup allowed</b-col>
      <b-col lg="3" ><b-form-checkbox class="pt-2 pb-2" v-model="settings.public_signup_allowed" switch @change="updateSettings('public_signup_allowed', settings.public_signup_allowed)"></b-form-checkbox></b-col>
    </b-row>
    <b-row>
      <b-col lg="3" class="font-weight-bold">Public can view</b-col>
      <b-col lg="3" ><b-form-checkbox class="pt-2 pb-2" v-model="settings.public_can_view" switch @change="updateSettings('public_can_view', settings.public_can_view)"></b-form-checkbox></b-col>
    </b-row>
    <b-row>
      <b-col lg="3" class="font-weight-bold">Public can submit</b-col>
      <b-col lg="3" ><b-form-checkbox class="pt-2 pb-2" v-model="settings.public_can_submit" switch @change="updateSettings('public_can_submit', settings.public_can_submit)"></b-form-checkbox></b-col>
    </b-row>
    <b-row>
      <b-col lg="3" class="font-weight-bold">Log level</b-col>
      <b-col lg="3" ><b-form-select v-model="settings.loglevel" :options="loglevels" @change="updateSettings('loglevel', settings.loglevel)" size="sm"></b-form-select></b-col>
    </b-row>
  </b-container>
</template>

<style scoped>
</style>

<script>
module.exports = {
  data: function() {
    return {
      settings: {},
      loglevels: [
        {value: 1, text: "DEBUG"},
        {value: 2, text: "INFO"},
        {value: 3, text: "WARN"},
        {value: 4, text: "ERROR"},
        {value: 5, text: "FATAL"}
      ]
    }
  },
  methods: {
    loadSettings: function() {
      axios({
        method: "get",
        url: "/admin/"
      }).then((result) => {
        this.settings = result.data;
      });
    },
    updateSettings: function(option, setting) {
      axios({
        method: "post",
        url: "/admin/options",
        data: {option: option, setting: setting}
      }).then((result) => {
        this.settings[option] = setting;
        this.$bvToast.toast(`successfully updated ${option} : ${setting}`, {
          autoHideDelay: 20000,
          variant: 'info',
          toaster: 'b-toaster-bottom-right'
        })
      }).catch((error) => {
        this.settings[option] = !setting;
        this.$bvToast.toast(error.message, {
          autoHideDelay: 20000,
          variant: 'danger',
          toaster: 'b-toaster-bottom-right'
        });
      });
    }
  },
  computed: {
  },
  components: {
  },
  beforeMount() {
    this.loadSettings();
  },
}
</script>