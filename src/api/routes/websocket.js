let socket;

exports = module.exports = function (io) {
  socket = io;
  io.sockets.on("connection", function (socket) {
    socket.emit(`connected`);

    //Connect to a specific room
    socket.on("joinRoom", async function (data) {
      try {
        //Join the room
        socket.join(data);
        //Send a message back saying they've successfully joined a room
        socket.emit(`roomJoined`, data);
      } catch (err) {
        console.log(err);
      }
    });

    //On a specific room message
    socket.on("someKindOfMessage", async function (data) {
      try {
        //Get list of clients in a specific room
        const clients = io.sockets.adapter.rooms.get(data.room);
        //Check that room actually contains this client
        if (clients.has(socket.id)) {
          //Broadcast this message and data back to all people in the room
          io.sockets.in(data.room).emit("someKindOfMessage", data);
        }
      } catch (err) {
        console.log(err);
      }
    })
  });
};

//Export a room broadcast message so you can broadcast from other functions in Node JS
exports.alertWebsocketRoom = function (room, type, data) {
  socket.sockets.in(room).emit(type, data);
};
