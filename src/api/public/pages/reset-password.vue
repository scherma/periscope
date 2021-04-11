<template>
<b-container fluid>
  <b-form id="reset-password">
    <b-container>
      <b-row>
        <b-col><h3>Reset your password</h3></b-col>
      </b-row>
      <b-row class="mb-2">
        <b-col md="6">Account: {{parsedMail}}</b-col>
      </b-row>
      <b-row>
        <b-col>
          &nbsp;
        </b-col>
      </b-row>
      <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
        <b-row class="mb-2">
          <b-col md="6">
            <b-form-input id="password" v-model="form.password" required placeholder="password" type="password"></b-form-input>
          </b-col>
          <b-col md="6 pt-2">
            <span class="input-error">{{ errors[0] }}</span>
          </b-col>
        </b-row>
      </validation-provider>
      <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
        <b-row class="mb-2">
          <b-col md="6">
            <b-form-input 
              id="password-confirm" v-model="form.password_confirm" required placeholder="confirm password" 
              type="password" @keydown.enter.native="resetPassword"></b-form-input>
          </b-col>
          <b-col md="6 pt-2">
            <span class="input-error">{{ errors[0] }}</span>
          </b-col>
        </b-row>
      </validation-provider>
      <b-row>
        <b-col>
          &nbsp;
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-button variant="primary" @click="resetPassword">Submit</b-button>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          &nbsp;
        </b-col>
      </b-row>
    <b-container>
  </b-form>
</b-container>
</template>

<style scoped>
.input-error {
  color: #D21B1B;
}
</style>

<script>
const VeeValidate = window.VeeValidate;
const VeeValidateRules = window.VeeValidateRules;
const ValidationProvider = VeeValidate.ValidationProvider;
const ValidationObserver = VeeValidate.ValidationObserver;

VeeValidate.extend('minmax', {
  validate(value, args) {
    return value.length <= args.max && value.length >= args.min;
  },
  params: ['min', 'max'],
  message: `Invalid length`
});

VeeValidate.extend('required', {
  ...VeeValidateRules.required,
  message: 'This is a required field'
});

module.exports = {
  data: function() {
    return {
      form: {
        password: null,
        password_confirm: null,
      }
    }
  },
  methods: {
    resetPassword: async function() {
      let form = this.form;
      form.email = this.parsedMail;
      form.token = this.$route.query.token;
      axios({
        method: "post",
        url: "/account/password-reset/submit",
        data: form
      }).then((result) => {
        router.push({path: "/login", params: {message: "successfuly reset password"}});
      }).catch((error) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Error resetting password",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
        let frm = document.getElementById("reset-password");
        frm.reset();
      }).finally(() => {
      });
    }
  },
  computed: {
    parsedMail: function() {
      return decodeURI(this.$route.query.email)
    }
  },
  components: {
    ValidationProvider
  },
  mounted() {
    if (this.$route.query.message) {
      this.$bvToast.toast(this.$route.query.message, {
        title: "Alert!",
        variant: "danger",
        solid: true,
        toaster: 'b-toaster-top-center',
        autoHideDelay: 20000
      });
    }
  }
}
</script>