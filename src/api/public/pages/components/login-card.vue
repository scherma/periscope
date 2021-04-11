<template>
  <b-modal id="login-card" title="Login" v-model="display">
    <b-form id="login-form">
      <b-container>
        <b-form-input v-model="form.userid" required placeholder="username or email" ref="username"
          class="mb-2" autofocus></b-form-input>
        <b-form-input id="password" v-model="form.password" required placeholder="password" 
          class="mb-2" type="password" @keydown.enter.native="login()"></b-form-input> 
      </b-container>
    </b-form>
    <template #modal-footer>
      <b-button @click="forgotpw()" class="mr-auto">Forgot password</b-button>
      <b-button variant="primary" @click="login()">Login</b-button>
    </template>
  </b-modal>
</template>

<style scoped>
.login-card {
  width: 90%;
  margin-top: 20px;
  z-index: 999;
  position: absolute;
}
</style>

<script>
module.exports = {
  props: {
    display: Boolean,
  },
  data: function() {
    return {
      form: {
        userid: null,
        password: null
      }
    }
  },
  methods: {
    login: async function() {
      axios({
        method: "post",
        url: "/login",
        data: this.form
      }).then((result) => {
        if (this.$route.path == "/login") {
          router.push("/");
        } else {
          this.display = false;
          this.$emit('auth', 'success');
        }
      }).catch((error) => {
        let frm = document.getElementById("login-form");
        frm.reset();

        console.log(error.response);

        if (error.response.status==401 && error.response.data && error.response.data.message && error.response.data.message=="must_change_password") {
          let changedata = error.response.data;
          
          router.push({
            path: `/account/reset-password`,
            query: {
              token: changedata.token,
              email: changedata.email,
              message: "You must set a new password"
            }
          });
        } else {
          this.$bvToast.toast(error.response.data.message, {
            title: "Error logging in",
            variant: "danger",
            toaster: 'b-toaster-bottom-center'
          });
        }
      });
    },
    forgotpw: function() {
      router.push("/account/forgot-password");
    }
  },
  computed: {
  },
  mounted() {
  }
}
</script>