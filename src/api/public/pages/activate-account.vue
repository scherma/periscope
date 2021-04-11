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
    confirmAccount: async function() {
      axios({
        method: "post",
        url: "/account/activate",
        params: {
          token: this.$route.query.token,
          email: this.$route.query.email
        }
      }).then((result) => {
        this.$bvToast.toast(result.data.message, {
          title: "Activation Result",
          variant: "info",
          toaster: 'b-toaster-bottom-center'
        });
        
        router.push({path: '/login', params: {validated: true, email: this.$route.query.email}});
      }).catch((err) => {
        this.$bvToast.toast(error.response.data.message, {
          title: "Activation Error",
          variant: "danger",
          toaster: 'b-toaster-bottom-center'
        });
      });;
    }
  },
  computed: {
  },
  beforeMount: function() {
    this.confirmAccount();
  }
}
</script>