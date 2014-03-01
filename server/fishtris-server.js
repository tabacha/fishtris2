var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    player = 0,
    fs = require('fs')
    app.listen(8080);

var seed = Math.round(Math.random(0, 999999));

function handler(req, res) {
    console.log(req.url);
    var filename = 'error.html';
    if (req.url == '/')
        filename = 'index.html';
    if (req.url == '/fishtris.js')
        filename = 'fishtris.js';
    if (req.url == '/stats.js')
        filename = 'stats.js';
    if (req.url == '/MersenneTwister.js')
        filename = 'MersenneTwister.js';
    fs.readFile(__dirname + '/../' + filename,
        function(err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading ' + filename);
            }

            res.writeHead(200);
            res.end(data);
        });
}

io.sockets.on('connection', function(socket) {
    socket.emit('logininfo', {
        player: player

    });
    var roomno = Math.floor(player / 2);
    console.log('room' + roomno);
    socket.join('room' + roomno);
    socket.set('myroom', 'room' + roomno, function() {});
    if ((player % 2) == 1) {
        console.log('game ready');
        io.sockets. in ('room' + roomno).emit('game_ready', seed);
    }
    player = player + 1
    socket.on('score', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('score ', data, room);
            socket.broadcast.to(room).emit('op_score', data);
        });

    });
    socket.on('rows', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('rows ', data, room);
            socket.broadcast.to(room).emit('op_rows', data);
        });

    });
    socket.on('gnus', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('gnus ', data, room);
            socket.broadcast.to(room).emit('op_gnus', data);
        });

    });
    socket.on('down', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('down ', room);
            socket.broadcast.to(room).emit('op_down', data);
        });

    });
    socket.on('cur', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('cur ', room);
            socket.broadcast.to(room).emit('op_cur', data);
        });

    });
    socket.on('fishtris', function(data) {
        socket.get('myroom', function(err, room) {
            console.log('fishtris ', room);
            socket.broadcast.to(room).emit('op_fishtris', data);
        });

    });
    socket.on('start', function(data) {
        socket.get('myroom', function(err, room) {
            socket.broadcast.to(room).emit('start', data);
        });

    });
    socket.on('next', function(data) {
        socket.get('myroom', function(err, room) {
            socket.broadcast.to(room).emit('op_next', data);
        });

    });
});
