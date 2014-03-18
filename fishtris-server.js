'use strict';
/* jshint node: true */

var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    player = 0,
    stoneids = ['i', 'j', 'l', 'o', 's', 't', 'z', 'f'],
    DIR = {
        MIN: 0,
        MAX: 3
    },
    nx = 8,
    ny = 20,
    fs = require('fs');

app.listen(8080);

function isInteger(data) {
    return (typeof data === 'number') && Math.floor(data) === data;
}

function isStoneId(data) {
    return (stoneids.indexOf(data) != -1);
}

function isBetween(min, max, data) {
    if (isInteger(data)) {
        return ((data >= min) && (data <= max));
    } //  else 
    return false;

}
// FIXME create one fishtrisAction Module
var fishtrisActions = ['Ringel', 'Wonne', 'Riegel', 'Schneck', 'Gnubaby', 'Tonne', 'Blubber', 'BigFISH', 'Bohrer', 'OberGNU'];
var seed = Math.round(Math.random(0, 999999));

function handler(req, res) {
    console.log(req.url);
    var filename = 'error.html';
    var contenttype = 'text/html';
    if (req.url == '/') {
        filename = 'index.html';
    } else {
        filename = req.url.substring(1);
        var teststr = filename;
        teststr = teststr.replace(/\w/g, '');
        teststr = teststr.replace(/\./g, '');
        teststr = teststr.replace(/\-/g, '');
        teststr = teststr.replace(/_/g, '');
        if (teststr !== '') {
            filename = 'error.html';
        }
    }
    if (filename.search(/\.js$/) > -1) {
        contenttype = 'application/javascript';
    }
    if (filename.search(/\.css$/) > -1) {
        contenttype = 'text/css';
    }
    if (filename.search(/\.ico$/) > -1) {
        contenttype = 'image/x-icon';
    }
    if (filename.search(/\.txt$/) > -1) {
        contenttype = 'text/plain';
    }
    if (filename.search(/\.EXE$/) > -1) {
        contenttype = 'application/octet-stream';
    }

    fs.readFile(__dirname + '/' + filename,
        function(err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading ' + filename);
            }

            res.writeHead(200, {
                'Content-Type': contenttype
            });
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
    player = player + 1;
    socket.on('score', function(data) {
        if (isInteger(data)) {
            socket.get('myroom', function(err, room) {
                console.log('score ', data, room);
                socket.broadcast.to(room).emit('op_score', data);
            });
        } else {
            console.log('Scrore with no integer');
        }

    });
    socket.on('rows', function(data) {
        if (isInteger(data)) {
            socket.get('myroom', function(err, room) {
                console.log('rows ', data, room);
                socket.broadcast.to(room).emit('op_rows', data);
            });
        } else {
            console.log('rows with no integer');
        }
    });
    socket.on('gnus', function(data) {
        if (isInteger(data)) {
            socket.get('myroom', function(err, room) {
                console.log('gnus ', data, room);
                socket.broadcast.to(room).emit('op_gnus', data);
            });
        } else {
            console.log('gnus with no integer');
        }

    });
    socket.on('down', function(data) {
        if (isStoneId(data.id) &&
            isBetween(0, nx - 1, data.x) &&
            isBetween(0, ny - 1, data.y) &&
            isBetween(DIR.MIN, DIR.MAX, data.dir)) {

            socket.get('myroom', function(err, room) {
                console.log('down ', room);
                socket.broadcast.to(room).emit('op_down', data);
            });
        } else {
            console.log('illegal data on down');
        }
    });
    socket.on('cur', function(data) {
        if (isStoneId(data.id) &&
            isBetween(0, nx - 1, data.x) &&
            isBetween(0, ny - 1, data.y) &&
            isBetween(DIR.MIN, DIR.MAX, data.dir)) {
            socket.get('myroom', function(err, room) {
                console.log('cur ', room);
                socket.broadcast.to(room).emit('op_cur', data);
            });
        } else {
            console.log('cur illegal data');
        }
    });
    socket.on('fishtris', function(data) {
        if (fishtrisActions.indexOf(data) != -1) {
            console.log('ERROR: Illegal fishtrisAction');
        } else {
            socket.get('myroom', function(err, room) {
                console.log('fishtris ', room);
                socket.broadcast.to(room).emit('op_fishtris', data);
            });
        }

    });
    socket.on('start', function(data) {
        if (data === 1) {

            socket.get('myroom', function(err, room) {
                console.log('start', room);
                io.sockets. in (room).emit('start', data);
            });
        } else {
            console.log('illegal data on start action');
        }

    });
    socket.on('next', function(data) {
        if (isStoneId(data)) {
            socket.get('myroom', function(err, room) {
                socket.broadcast.to(room).emit('op_next', data);
            });
        } else {
            console.log('illegal data on next action');
        }

    });
    // FIXME Handle 'loose'
});
