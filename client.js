/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

 var socket = io.connect("http://localhost");
  var socket = io("http://localhost");
  socket.on('news', function (data) {
    console.log(data);
    socket.emit("my othet event", { my: 'data' });
  });