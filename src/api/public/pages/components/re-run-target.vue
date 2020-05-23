<template>
    <b-button size="sm" @click="reRun" variant="secondary" class="re-run" right><b-icon-arrow-clockwise font-scale="1.5"></b-icon-arrow-clockwise> Re-run</b-button>
</template>

<style scoped>
button.btn.re-run {
  width: 100%;
}

@media (max-width: 767px) {
  .re-run {
    margin: 2px 0 2px 0 !important;
  }
}
</style>

<script>
module.exports = {
  name: 're-run',
  props: {
    targetid: Number,
  },
  data: function() {
    return {
    }
  },
  methods: {
    reRun: async function() {
      let result = await axios({
        method: "get",
        url: "/targets/" + this.targetid + "/new-visit"
      });
      this.$emit("visit-rerun", result.data.visit.visit_id);
    }
  },
  computed: {
  }
}
</script>