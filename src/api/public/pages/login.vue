<template>
  <login v-bind:display="showLogin"></login>
</template>

<style scoped>
</style>

<script>
module.exports = {
  data: function() {
    return {
      showLogin: true
    }
  },
  methods: {
  },
  computed: {
  },
  components: {
    login: httpVueLoader("/pages/components/login-card.vue"),
  }
}
</script>