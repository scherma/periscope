<template>
<b-container fluid>
  <create :password_must_change="false"></create>
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
  },
  computed: {
  },
  components: {
    create: httpVueLoader("/pages/components/create-account.vue")
  }
}
</script>