<template>
<b-container fluid>
  <b-form id="forgot-password">
    <b-container>
      <b-row>
        <b-col><h3>Request password reset</h3></b-col>
      </b-row>
      <validation-provider rules="required|minmax:6,100" v-slot="{ errors }">
        <b-row class="mb-2">
          <b-col md="6">
              <b-form-input id="userid" v-model="form.userid" required placeholder="Username or email" type="text" @keydown.enter.native="pwResetRequest"></b-form-input>
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
          <b-button variant="primary" @click="pwResetRequest()">Request reset</b-button>
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
})

module.exports = {
  data: function() {
    return {
      form: {
        userid: null
      }
    }
  },
  methods: {
    pwResetRequest: async function() {
      axios({
        method: "post",
        url: "/account/password-reset/request",
        data: this.form
      }).then((result) => {
        this.$bvToast.toast(result.data.message, {
          title: "Password reset request",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });
      }).catch((error) => {          
        this.$bvToast.toast(error.response.data.message, {
          title: "Password reset request error",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
      }).finally(() => {
        let frm = document.getElementById("forgot-password");
        frm.reset();
      });
    }
  },
  computed: {
  },
  components: {
    ValidationProvider
  }
}
</script>