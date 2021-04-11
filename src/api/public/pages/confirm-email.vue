<template>
<b-container fluid>
</b-container>
</template>

<style scoped>
</style>

<script>
module.exports = {
  data: function() {
    return {
    }
  },
  methods: {
    confirmEmail: async function() {
      axios({
        method: "post",
        url: "/account/email/confirm",
        params: {
          token: this.$route.query.token,
          email: this.$route.query.email
        }
      }).then((result) => {
        this.$bvToast.toast(result.data.message, {
          title: "Email confirmation",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });
        
        router.push({path: '/login', params: {validated: true, email: this.$route.query.email}});
      }).catch((error) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Error confirming email",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
      });;
    }
  },
  computed: {
  },
  beforeMount: function() {
    this.confirmEmail();
  }
}
</script>