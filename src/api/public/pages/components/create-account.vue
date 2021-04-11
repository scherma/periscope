<template>
<b-form id="new-account">
  <b-container>
    <b-row>
      <b-col><h3>Create new account</h3></b-col>
    </b-row>
    <validation-provider rules="required|minmax:8,100" v-slot="{ errors }">
      <b-row class="mb-2">
        <b-col md="6">
          <b-form-input id="username" v-model="form.username" required placeholder="username" type="text"></b-form-input>
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
    <validation-provider name="email" rules="required|email|minmax:6,100" v-slot="{ errors }" type="email">
      <b-row class="mb-2">
        <b-col md="6">
          <b-form-input id="email" v-model="form.email" required placeholder="email address"></b-form-input>
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
          <b-form-input id="password-confirm" v-model="form.password_confirm" required placeholder="confirm password" type="password"></b-form-input>
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
        <b-button variant="primary" @click="createAccount()">Create</b-button>
      </b-col>
    </b-row>
    <b-row>
      <b-col>
        &nbsp;
      </b-col>
    </b-row>
  <b-container>
</b-form>
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
  props: {
    password_must_change: Boolean
  },
  data: function() {
    return {
      form: {
        username: null,
        password: null,
        password_confirm: null,
        email: null
      }
    }
  },
  methods: {
    createAccount: async function() {
      let data = this.form;
      data.token = this.$route.query.token;
      axios({
        method: "post",
        url: "/account/new",
        data: data
      }).then((result) => {
        if (this.password_must_change) {
          axios({
            method: "post",
            url: `/admin/must-change-password/${result.data.user_id}`
          }).then((result) => {
            this.$bvToast.toast(result.data.message, {
              title: "Set password_must_change",
              variant: "info",
              toaster: "b-toaster-bottom-center",
              appendToast: true
            });
          }).catch((error) => {
            this.$bvToast.toast(error.response.data.message, {
              title: "Error setting must_change_password",
              variant: "info",
              toaster: "b-toaster-bottom-center",
              appendToast: true
            })
          });
        }
        
        this.$bvToast.toast(result.data.message, {
          title: "Creation Result",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });
        
        let frm = document.getElementById("new-account");
        frm.reset();
      }).catch((error) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Error creating account",
          variant: "danger",
          toaster: 'b-toaster-bottom-center',
          appendToast: true
        });
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