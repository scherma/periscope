<template>
<b-container fluid>
  <login v-bind:display="showLogin" @auth="authSuccess"></login>
  <b-modal id="pw-update-card" title="Change Password" v-model="displayPwForm">
    <b-form id="pw-update-form">
      <b-container>
        <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input v-model="pwForm.oldpass" required placeholder="old password" ref="oldpass"
                class="mb-2" type="password"></b-form-input>
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
        <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input id="newpass" v-model="pwForm.newpass" required placeholder="new password" 
                class="mb-2" type="password"></b-form-input> 
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
        <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input id="newpass_confirm" v-model="pwForm.newpass_confirm" required placeholder="confirm new password" 
                class="mb-2" type="password" @keydown.enter.native="pwUpdate"></b-form-input> 
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
      </b-container>
    </b-form>
    <template #modal-footer>
      <b-button variant="primary" @click="pwUpdate">Change Password</b-button>
    </template>
  </b-modal>
  <b-modal id="email-update-card" title="Change Email" v-model="displayEmailForm">
    <b-form id="email-update-form">
      <b-container>
        <validation-provider rules="required|email|minmax:6,100" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input v-model="emailForm.proposed_email" required placeholder="new email" ref="newmail" class="mb-2"></b-form-input>
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
        <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input v-model="emailForm.password" required placeholder="password required to confirm" ref="password"
                class="mb-2" type="password" @keydown.enter.native="emailUpdate"></b-form-input>
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
      </b-container>
    </b-form>
    <template #modal-footer>
      <b-button variant="primary" @click="emailUpdate">Change Email</b-button>
    </template>
  </b-modal>
  <b-modal id="account-delete-card" title="Delete Account" v-model="displayDeleteForm">
    <b-form id="account-delete-form">
      <b-container>
        <validation-provider rules="required|minmax:8,1024" v-slot="{ errors }">
          <b-row>
            <b-col>
              <b-form-input v-model="deleteForm.password" required placeholder="enter password to confirm" type="password" class="mb-2"></b-form-input>
            </b-col>
          </b-row>
          <b-row>
            <b-col>
              <span class="input-error">{{ errors[0] }}</span>
            </b-col>
          </b-row>
        </validation-provider>
        <b-row>
          <b-col>Warning: this action cannot be undone!</b-col>
        </b-row>
      </b-container>
    </b-form>
    <template #modal-footer>
      <b-button variant="danger" @click="accountDelete">Delete Account</b-button>
    </template>
  </b-modal>
  <b-container fluid v-if="loggedIn">
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Username</b-col>
      <b-col sm="6" md="4" lg="3">{{account.username}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Email</b-col>
      <b-col sm="6" md="4" lg="3">{{account.email}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Password last modified</b-col>
      <b-col sm="6" md="4" lg="3">{{moment(account.password_modified_time).format("YYYY-MM-DD HH:mm:ss")}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Last login</b-col>
      <b-col sm="6" md="4" lg="3">{{moment(account.last_login).format("YYYY-MM-DD HH:mm:ss")}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Last login IP</b-col>
      <b-col sm="6" md="4" lg="3">{{account.last_login_ip}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Account created</b-col>
      <b-col sm="6" md="4" lg="3">{{moment(account.account_created_time).format("YYYY-MM-DD HH:mm:ss")}}</b-col>
    </b-row>
    <b-row>
      <b-col sm="6" md="4" lg="3" class="font-weight-bold">Roles</b-col>
      <b-col sm="6" md="4" lg="3">{{rolesDisplay}}</b-col>
    </b-row>
    <b-row>
      <b-col>&nbsp;</b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-button class="acct-button" v-b-modal.pw-update-card>Change Password</b-button>
        <b-button class="acct-button acct-button-mid" v-b-modal.email-update-card>Change Email</b-button>
        <b-button class="acct-button" v-b-modal.account-delete-card variant="danger">Delete Account</b-button>
      </b-col>
    <b-row>
    </b-row>
    <b-row>
      <b-col>&nbsp;</b-col>
    </b-row>
  </b-container>
</b-container>
</template>

<style scoped>
.target-row {
  padding: 10px 0 10px 0;
}
.target-row:nth-child(odd) {
  background-color: var(--white);
  border-radius: .25rem;
}

.pagenav {
  padding: 10px 0 10px 0;
}

.input-error {
  color: #D21B1B;
}

@media (max-width: 767px) {
  .acct-button {
    width: 100% !important;
  }

  .acct-button-mid {
    margin-top: 0.375rem;
    margin-bottom: 0.375rem;
  }
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

VeeValidate.extend('email', {
  ...VeeValidateRules.email,
  message: "Not a valid email"
});

module.exports = {
  data: function() {
    return {
      title: "Targets",
      account: null,
      loggedIn: false,
      showLogin: false,
      pwForm: {
        oldpass: null,
        newpass: null,
        newpass_confirm: null
      },
      displayPwForm: false,
      emailForm: {
        proposed_email: null,
        password: null
      },
      displayEmailForm: false,
      deleteForm: {
        password: null
      },
      displayDeleteForm: false
    };
  },
  methods: {
    fetchAccount: async function () {
      axios({
        method: "get",
        url: `/account/view`,
      }).then((result) => {
        this.account = result.data;
        this.loggedIn = true;
        this.showLogin = false;
      }).catch((err) => {
        if (err.response.status == 401) {
          this.loggedIn = false;
          this.showLogin = true;
        }
      });
    },
    authSuccess() {
      this.fetchAccount();
      this.$emit('auth', 'success');
    },
    pwUpdate() {
      let form = this.pwForm;
      form.email = this.account.email;
      axios({
        method: "post",
        url: "/account/password/set",
        data: form
      }).then((result) => {
        this.displayPwForm = false;
        
        this.$bvToast.toast(result.data.message, {
          title: "Password update",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });

        document.getElementById("pw-update-form").reset();
        this.fetchAccount();
      }).catch((error) => {
        this.displayPwForm = false;
        
        this.$bvToast.toast(error.response.data.message, {
          title: "Error updating password",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });

        document.getElementById("pw-update-form").reset();
      });
    },
    emailUpdate() {
      let form = this.emailForm;
      form.email = this.account.email;
      axios({
        method: "post",
        url: "/account/email/set",
        data: form
      }).then((result) => {
        this.displayEmailForm = false;
        
        this.$bvToast.toast(result.data.message, {
          title: "Email update",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });

        document.getElementById("email-update-form").reset();
      }).catch((error) => {
        this.displayEmailForm = false;

        this.$bvToast.toast(error.response.data.message, {
          title: "Error updating email",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });

        document.getElementById("email-update-form").reset();
      });
    },
    accountDelete() {
      axios({
        method: "post",
        url: "/account/delete",
        data: this.deleteForm
      }).then((result) => {
        router.push("/");
      }).catch((error) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Error deleting account",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });

        document.getElementById("account-delete-form").reset();
      });
    }
  },
  computed: {
    rolesDisplay: function() {
      return this.account.roles.join(", ");
    }
  },
  beforeMount: function () {
    this.fetchAccount();
  },
  components: {
    login: httpVueLoader("/pages/components/login-card.vue"),
    ValidationProvider
  }
}
</script>