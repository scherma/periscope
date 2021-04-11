<template>
  <b-container class="mb-2">
    <b-row>
      <b-col md="6"><h3>Issue account create token</h3></b-col>
    </b-row>
    <validation-provider rules="required|email|minmax:6,1024" v-slot="{ errors }">
      <b-row>
        <b-col md="6">
          <b-form-input id="password-confirm" v-model="form.email" required placeholder="email"></b-form-input>
        </b-col>
        <b-col md="6 pt-2">
          <span class="input-error">{{ errors[0] }}</span>
        </b-col>
      </b-row>
    </validation-provider>
    <b-row>
      <b-col>&nbsp;</b-col>
    </b-row>
    <b-row>
      <b-col md="6"><b-button variant="primary" @click="issue">Issue</b-button></b-col>
    </b-row>
    <b-row>
      <b-col>&nbsp;</b-col>
    </b-row>
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

VeeValidate.extend('email', {
  ...VeeValidateRules.email,
  message: "Not a valid email"
});

module.exports = {
  data: function() {
    return {
      form: {
        email: null
      }
    }
  },
  methods: {
    issue: function() {
      axios({
        method: "post",
        url: "/admin/create-signup-token",
        data: this.form
      }).then((result) => {
        this.$bvToast.toast(result.data.message, {
          title: "Issued signup token",
          variant: "info",
          toaster: "b-toaster-bottom-center",
          appendToast: true
        });
      }).catch((error) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Error issuing sigup token",
          variant: "info",
          toaster: "b-toaster-bottom-center",
          appendToast: true
        })
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
