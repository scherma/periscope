<template>
  <b-container class="ml-0 mr-0 w-100" fluid>
    <b-modal id="lock-user" :title="'Lock User Account ' + lockForm.name" v-model="showLockForm">
      <b-form id="lock-user-form">
        <b-container>
          <validation-provider rules="required" v-slot="{ errors }">
            <b-row>
              <b-col>
                <b-form-input v-model="lockForm.reason" required placeholder="account lock reason" ref="reason"></b-form-input>
              </b-col>
            </b-row>
            <b-row>
              <b-col md="6 pt-2">    
                <span class="input-error">{{ errors[0] }}</span>
              </b-col>
            </b-row>
          </validation-provider>
        </b-container>
      </b-form>
      <template #modal-footer>
        <b-button variant="danger" @click="lockUser">Lock</b-button>
      </template>
    </b-modal>
    <b-row class="font-weight-bold">
      <b-col lg="1">ID</b-col>
      <b-col lg="3">Username</b-col>
      <b-col lg="3">Email</b-col>
      <b-col lg="2">Last login</b-col>
      <b-col lg="2">From</b-col>
      <b-col lg="1"></b-col>
    </b-row>
    <b-row v-for="user in users" :key="user" class="mt-2 account-row" align-v="center">
      <b-col>
        <b-row>
          <b-col lg="1"><span class="btn btn-default btn-sm" v-b-toggle="`collapse-user-${user.user_id}`"><b-icon-caret-right-fill></b-icon-caret-right-fill></span> {{user.user_id}}</b-col>
          <b-col lg="3">
            <b-icon-lock-fill variant="danger" v-if="user.account_locked_out" v-b-tooltip.hover title="Account locked out"></b-icon-lock-fill>
            <b-icon-exclamation-triangle v-if="!user.account_activated" v-b-tooltip.hover title="Account not activated"></b-icon-exclamation-triangle>
            <b-icon-trash variant="danger" v-if="user.account_deleted" v-b-tooltip.hover title="Account deleted"></b-icon-trash>
            {{user.username}} 
          </b-col>
          <b-col lg="3">{{user.email}}</b-col>
          <b-col lg="2">{{moment(user.last_login).format("YYYY-MM-DD HH:mm")}}</b-col>
          <b-col lg="2">{{user.last_login_ip}}</b-col>
          <b-col lg="1">
            <span v-if="!user.account_deleted">
              <b-button class="pt-1 pb-1 pl-2 pr-2" @click="openLockForm(user.user_id, user.username)" v-if="!user.account_locked_out" v-b-tooltip.hover :title="`Lock account ${user.username}`">
                <b-icon-lock-fill font-scale="0.75"></b-icon-lock-fill>
              </b-button>
              <b-button class="pt-1 pb-1 pl-2 pr-2" @click="unlock(user.user_id)" v-else v-b-tooltip.hover :title="`Unlock account ${user.username}`">
                <b-icon-unlock-fill font-scale="0.75" class="mb-1"></b-icon-unlock-fill>
              </b-button>
            </span>
          </b-col>
        </b-row>
        <b-collapse :id="`collapse-user-${user.user_id}`">
          <b-container class="mr-1 ml-1">
            <b-row>
              <b-col>&nbsp;</b-col>
            </b-row>
            <b-row>
              <b-col lg="6">
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Created at</b-col><b-col sm="6">{{user.account_created_time}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Account activated?</b-col><b-col sm="6">{{user.account_activated}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Activation time</b-col><b-col sm="6">{{user.account_activated_time}}</b-col></b-row>
                <b-row class="account-detail-row">
                  <b-col sm="6" class="font-weight-bold">Activation token</b-col>
                  <b-col sm="6">
                    <span v-if="user.account_activate_token_used">{{user.account_activate_token}}</span><span v-else>Token used</span>
                  </b-col>
                </b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Email validated?</b-col><b-col sm="6">{{user.email_validated}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Validation time</b-col><b-col sm="6">{{user.email_validated_time}}</b-col></b-row>
                <b-row class="account-detail-row">
                  <b-col sm="6" class="font-weight-bold">Email token</b-col>
                  <b-col sm="6"><span v-if="user.email_validate_token_used">{{user.email_validate_token}}</span><span v-else>Token used</span></b-col>
                </b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Proposed email</b-col><b-col sm="6">{{user.proposed_email}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Roles</b-col><b-col sm="6">{{user.roles}}</b-col></b-row>
              </b-col>
              <b-col lg="6">
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Password last modified</b-col><b-col sm="6">{{user.password_modified_time}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Password reset token</b-col><b-col sm="6">{{displayPwToken(user)}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Locked out?</b-col><b-col sm="6">{{user.account_locked_out}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Lockout time</b-col><b-col sm="6">{{user.account_locked_out_time}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Lockout reason</b-col><b-col sm="6">{{user.account_locked_out_reason}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Failed logins since success</b-col><b-col sm="6">{{user.auth_failures_since_login}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Account deleted</b-col><b-col sm="6">{{user.account_deleted}}</b-col></b-row>
                <b-row class="account-detail-row"><b-col sm="6" class="font-weight-bold">Account deleted time</b-col><b-col sm="6">{{user.account_deleted_time}}</b-col></b-row>
              </b-col>
            </b-row>
            <b-row>
              <b-col>&nbsp;</b-col>
            </b-row>
          </b-container>
        </b-collapse>
      </b-col>
    </b-row>
  </b-container>
</template>

<style scoped>
.account-row {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.account-detail-row {
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;
}

.account-row:nth-child(even) {
  background-color: var(--white);
  border-radius: .25rem;
}
</style>

<script>
const VeeValidate = window.VeeValidate;
const VeeValidateRules = window.VeeValidateRules;
const ValidationProvider = VeeValidate.ValidationProvider;

VeeValidate.extend('required', {
  ...VeeValidateRules.required,
  message: 'This is a required field'
})

module.exports = {
  data: function() {
    return {
      users: [],
      showLockForm: false,
      lockForm: {
        name: null, 
        user_id: null,
        reason: null
      }
    }
  },
  methods: {
    loadUsers: function() {
      axios({
        method: "get",
        url: "/admin/users"
      }).then((result) => {
        this.users = result.data.data;
      });
    },
    lockUser: function() {
      axios({
        method: "post",
        url: `/admin/lock/${this.lockForm.user_id}`,
        data: {reason: this.lockForm.reason}
      }).then((result) => {
        this.loadUsers();
        this.showLockForm = false;
      }).catch((error) => {
        this.showLockForm = false;
        this.$bvToast.toast(error.response.data.message, {
          title: "Error locking account",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
      })
    },
    openLockForm: function(user_id, name) {
      this.lockForm.user_id = user_id;
      this.lockForm.name = name;
      this.showLockForm = true;
    },
    unlock: function(user_id) {
      axios({
        method: "post",
        url: `/admin/unlock/${user_id}`
      }).then((result) => {
        this.loadUsers();
      })
    },
    displayPwToken: function(user) {
      if (user.password_reset_token_used) {
        return "token used";
      } else if (moment(user.password_reset_token_expiry) < moment()) {
        return `token expired at ${user.password_reset_token_expiry}`;
      } else {
        return user.password_reset_token;
      }
    }
  },
  computed: {
  },
  components: {
    ValidationProvider
  },
  beforeMount() {
    this.loadUsers();
  },
}
</script>