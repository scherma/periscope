<template>
  <b-form id="newTarget">
    <b-row id="new-target">
      <b-col cols="12"><b-alert variant="danger" dismissible v-model="addError" fade>Error adding new target</b-alert></b-col>
      <b-col md="11">
        <label class="sr-only" for="url">URL</label>
        <b-input name="url" type="text" id="url" required placeholder="Sandbox new URL" v-model="form.url"></b-input>
      </b-col>
      <b-col md="1">
        <b-button type="submit" variant="secondary" class="float-right go"  @click.stop.prevent="submit()">Go</b-button>
      </b-col>
    </b-row>
  </b-form>
</template>

<style scoped>
@media (max-width: 767px) {
  .go {
    width: 100%;
    margin: 2px 0 2px 0;
  }
}
</style>

<script>
module.exports = {
  name: 'new-target',
  data: function() {
    return {
      form: {
        url: ''
      },
      addError: false
    }
  },
  methods: {
    submit: async function() {
      let result = await axios({
        method: "post",
        url: "/targets/add",
        data: this.form
      });
      if (result && result.data && result.data.visit && result.data.visit.visit_id) {
        let path = `/visit/${result.data.visit.visit_id}`;
        router.push(path);
      } else {
        this.addError = true;
      }
    }
  },
  computed: {
  }
}
</script>