Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    room: "",
  },
  actions: {
    async SOCKET_connected({ state }, data) {
      state.room = data.room
    },
    async SOCKET_roomJoined({ state }, data) {
      console.log(`socket roomJoined ${data}`);
      state.room = data;
    }
  }
})