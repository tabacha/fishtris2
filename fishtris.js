//-------------------------------------------------------------------------
// base helper methods
//-------------------------------------------------------------------------
var mt = new MersenneTwister();

function get(id) {
    return document.getElementById(id);
};

function hide(id) {
    get(id).style.visibility = 'hidden';
};

function show(id) {
    get(id).style.visibility = null;
};

function html(id, html) {
    get(id).innerHTML = html;
};

function timestamp() {
    return new Date().getTime();
};

function random(min, max) {
    return (min + (mt.rnd() * (max - min)));
};

function setClass(id, cl) {
    get(id).className = cl;
}


if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
    }
}

//-------------------------------------------------------------------------
// game constants
//-------------------------------------------------------------------------

var KEY = {
    ESC: 27,
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
},
    DIR = {
        UP: 0,
        RIGHT: 1,
        DOWN: 2,
        LEFT: 3,
        MIN: 0,
        MAX: 3
    },
    canvas = get('canvas'),
    ctx = canvas.getContext('2d'),
    ucanvas = get('upcoming'),
    uctx = ucanvas.getContext('2d'),
    opcanvas = get('canvasop'),
    opctx = opcanvas.getContext('2d'),
    opucanvas = get('upcomingop'),
    opuctx = opucanvas.getContext('2d'),
    speed = {
        start: 0.6,
        decrement: 0.005,
        min: 0.1
    }, // how long before piece drops by 1 row (seconds)
    nx = 8, // width of tetris court (in blocks)
    ny = 20, // height of tetris court (in blocks)
    nu = 5, // width/height of upcoming preview (in blocks)
    port = window.location.port,
    host = window.location.host;
if (port == "")
    port = "80"

if (window.location.protocol == "file:") {
    port = "8080"
    host = "localhost"
}
console.log("socket-url=" + host + ':' + port);
//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------
var socket = io.connect('http://' + host + ':' + port);

var speedRows = 0;
var dx, dy, // pixel size of a single tetris block
    my_blocks, // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    op_blocks,
    actions, // queue of user actions (inputs)
    playing, // true|false - game is in progress
    dt, // time since starting this game
    current, // the current piece
    next, // the next piece
    score, // the current score
    vscore, // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
    rows, // number of completed rows in the current game
    gnus, // number of gnus
    step; // how long before current piece drops by 1 row

var Block = function() {
    this.block = [];
    this.court = false;
};

my_blocks = new Block();

op_blocks = new Block();

//-------------------------------------------------------------------------
// tetris pieces
//
// blocks: each element represents a rotation of the piece (0, 90, 180, 270)
//         each element is a 16 bit integer where the 16 bits represent
//         a 4x4 set of blocks, e.g. j.blocks[0] = 0x44C0
//
//             0100 = 0x4 << 3 = 0x4000
//             0100 = 0x4 << 2 = 0x0400
//             1100 = 0xC << 1 = 0x00C0
//             0000 = 0x0 << 0 = 0x0000
//                               ------
//                               0x44C0
//
//-------------------------------------------------------------------------

var stone = {
    i: {
        id: 'i',
        size: 4,
        blocks: [0x0F00, 0x2222, 0x00F0, 0x4444],
        color: '#ffff55'
    },
    j: {
        id: 'j',
        size: 3,
        blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20],
        color: '#0000aa'
    },
    l: {
        id: 'l',
        size: 3,
        blocks: [0x4460, 0x0E80, 0xC440, 0x2E00],
        color: '#00aa00'
    },
    o: {
        id: 'o',
        size: 2,
        blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00],
        color: '#00aaaa'
    },
    s: {
        id: 's',
        size: 3,
        blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620],
        color: '#55ff55'
    },
    t: {
        id: 't',
        size: 3,
        blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640],
        color: '#aa0000'
    },
    z: {
        id: 'z',
        size: 3,
        blocks: [0x0C60, 0x4C80, 0xC600, 0x2640],
        color: '#ff5555'
    },
    f: {
        id: 'f',
        size: 4,
        blocks: [0x5F50, 0x2727, 0x0AFA, 0xE4E4],
        color: '#ffffff'
    }
};

// FISHTRIS Actions

var fishtrisActions = [{
        id: "Ringel",
        gnu: 12,
        action: function() {
            my_blocks.removeLine(ny);
        },
        op_action: function() {
            op_blocks.removeLine(ny);
        }
    }, {
        id: "Wonne",
        gnu: 15,
        action: function() {
            fishtris_pieces.push({
                type: stone.i,
                dir: DIR.UP,
                x: Math.round((nx - stone.i.size) / 2),
                y: 0
            });
        },
        op_action: function() {}

    }, {
        id: "Riegel",
        gnu: 20,
        action: function() {
            my_blocks.removeLine(ny);
            my_blocks.removeLine(ny);
            my_blocks.removeLine(ny);
        },
        op_action: function() {
            op_blocks.removeLine(ny);
            op_blocks.removeLine(ny);
            op_blocks.removeLine(ny);
        }
    }, {
        id: "Schneck",
        gnu: 24,
        action: function() {
            speedRows = speedRows - 100;
            setRows(rows);
        },
        op_action: function() {}

    }, {
        id: "Gnubaby",
        gnu: 3,
        action: function() {
            op_blocks.removeLine(ny);
        },
        op_action: function() {
            my_blocks.removeLine(ny);
        }
    }, {
        id: "Tonne",
        gnu: 6,
        action: function() {},
        op_action: function() {
            fishtris_pieces.push({
                type: stone.i,
                dir: DIR.UP,
                x: Math.round((nx - stone.i.size) / 2),
                y: 0
            });
        }
    }, {
        id: "Blubber",
        gnu: 8,
        action: function() {
            op_blocks.removeLine(ny);
            op_blocks.removeLine(ny);
            op_blocks.removeLine(ny);
        },
        op_action: function() {
            my_blocks.removeLine(ny);
            my_blocks.removeLine(ny);
            my_blocks.removeLine(ny);
        }
    }, {
        id: "BigFISH",
        gnu: 22,
        action: function() {},
        op_action: function() {
            fishtris_pieces.push({
                type: stone.f,
                dir: DIR.UP,
                x: Math.round((nx - stone.f.size) / 2),
                y: 0
            });
        }
    }, {
        id: "Bohrer",
        gnu: 26,
        action: function() {
            var x, y;
            for (y = 0; y < ny; ++y) {
                for (x = 0; x < nx; ++x) {
                    if (op_blocks.get(x, y) != null) {
                        var tmp = (x + y) % 3;
                        if (tmp == 1) {
                            op_blocks.set(x, y, null);
                        }
                    }
                }
            }

        },
        op_action: function() {
            var x, y;
            for (y = 0; y < ny; ++y) {
                for (x = 0; x < nx; ++x) {
                    if (my_blocks.get(x, y) != null) {
                        var tmp = (x + y) % 3;
                        if (tmp == 1) {
                            my_blocks.set(x, y, null);
                        }
                    }
                }
            }
        }
    }, {
        id: "OberGNU",
        gnu: 30,
        action: function() {},
        op_action: function() {
            speedRows = speedRows + 100;
            setRows(rows);
        }
    },

];

function setGnuStatus() {
    fishtrisActions.forEach(function(action) {
        if (get(action.id) == null) {
            console.log("Action '" + action.id + "' not found in html");
        }
        if (gnus >= action.gnu) {
            setClass(action.id, "action-active");
            get(action.id).onclick = function() {
                console.log("click" + action.id);
                socket.emit('fishtris', action.id);
                addGnus(0 - action.gnu);
                action.action();
            };
        } else {
            setClass(action.id, "action-disabled");
            get(action.id).onclick = function() {};

        }
    });
};

var dropall = false;
//------------------------------------------------
// do the bit manipulation and iterate through each
// occupied block (x,y) for a given piece
//------------------------------------------------
function eachblock(type, x, y, dir, fn) {
    var bit, result, row = 0,
        col = 0,
        blocks = type.blocks[dir];
    for (bit = 0x8000; bit > 0; bit = bit >> 1) {
        if (blocks & bit) {
            fn(x + col, y + row);
        }
        if (++col === 4) {
            col = 0;
            ++row;
        }
    }
};


//-----------------------------------------------------
// check if a piece can fit into a position in the grid
//-----------------------------------------------------
Block.prototype.occupied = function(type, x, y, dir) {
    var result = false;
    var self = this;
    eachblock(type, x, y, dir, function(x, y) {
        if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || self.get(x, y))
            result = true;
    });
    return result;
};

Block.prototype.unoccupied = function(type, x, y, dir) {
    return !this.occupied(type, x, y, dir);
};

//-----------------------------------------
// start with 4 instances of each piece and
// pick randomly until the 'bag is empty'
//-----------------------------------------
var pieces = [];
var fishtris_pieces = [];

function randomPiece() {
    if (pieces.length == 0)
        pieces = [stone.i, stone.i, stone.i, stone.i, stone.j, stone.j, stone.j, stone.j, stone.l, stone.l, stone.l, stone.l, stone.o, stone.o, stone.o, stone.o, stone.s, stone.s, stone.s, stone.s, stone.t, stone.t, stone.t, stone.t, stone.z, stone.z, stone.z, stone.z];
    var type = pieces.splice(random(0, pieces.length - 1), 1)[0];
    return {
        type: type,
        dir: DIR.UP,
        x: Math.round((nx - type.size) / 2),
        y: 0
    };
};


//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {

    addEvents(); // attach keydown and resize events

    var last = now = timestamp();

    function frame() {
        now = timestamp();
        update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        draw();
        last = now;
        requestAnimationFrame(frame, canvas);
    }

    resize(); // setup all our sizing information
    reset(); // reset the per-game variables
    frame(); // start the first frame

};

function addEvents() {
    document.addEventListener('keydown', keydown, false);
    window.addEventListener('resize', resize, false);
};

function resize(event) {
    canvas.width = canvas.clientWidth; // set canvas logical size equal to its physical size
    canvas.height = canvas.clientHeight; // (ditto)
    opcanvas.width = opcanvas.clientWidth;
    opcanvas.height = opcanvas.clientHeight;

    ucanvas.width = ucanvas.clientWidth;
    ucanvas.height = ucanvas.clientHeight;
    opucanvas.width = opucanvas.clientWidth;
    opucanvas.height = opucanvas.clientHeight;
    dx = canvas.width / nx; // pixel size of a single tetris block
    dy = canvas.height / ny; // (ditto)
    my_blocks.invalidate();
    invalidateNext();
};

function keydown(ev) {
    var handled = false;
    if (playing) {
        switch (ev.keyCode) {
            case KEY.LEFT:
                actions.push(DIR.LEFT);
                handled = true;
                break;
            case KEY.RIGHT:
                actions.push(DIR.RIGHT);
                handled = true;
                break;
            case KEY.UP:
                actions.push(DIR.UP);
                handled = true;
                break;
            case KEY.DOWN:
                actions.push(DIR.DOWN);
                dropall = true;
                handled = true;
                break;
            case KEY.ESC:
                lose();
                handled = true;
                break;
        }
    } else if (ev.keyCode == KEY.SPACE) {
        play();
        handled = true;
    }
    if (handled)
        ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
};




//-------------------------------------------------------------------------
// GAME LOGIC
//-------------------------------------------------------------------------

function play() {
    hide('start');
    reset();
    playing = true;
    socket.emit('start', true);
};

function lose() {
    show('start');
    setVisualScore();
    playing = false;
    socket.emit('loose', true);
};

function setVisualScore(n) {
    vscore = n || score;
    invalidateScore();
};

function setScore(n) {
    score = n;
    setVisualScore(n);
    socket.emit("score", score);
};

function addScore(n) {
    score = score + n;
    socket.emit("score", score);
};

function clearScore() {
    setScore(0);
};

function clearRows() {
    setRows(0);
};

function setRows(n) {
    rows = n;
    step = Math.max(speed.min, speed.start - (speed.decrement * (rows + speedRows)));
    invalidateRows();
    socket.emit("rows", rows);
};

function addRows(n) {
    setRows(rows + n);
};

function addGnus(n) {
    setGnus(gnus + n);
};

function setGnus(n) {
    gnus = n;
    socket.emit("gnus", gnus);
    setGnuStatus();
    invalidateGnus();
}

function clearGnus() {
    setGnus(0);
};

Block.prototype.get = function(x, y) {
    var rtn = (this.block && this.block[x] ? this.block[x][y] : null);
    return rtn
};

Block.prototype.set = function(x, y, color) {
    this.block[x] = this.block[x] || [];
    this.block[x][y] = color;
    this.invalidate();
};


Block.prototype.clear = function() {
    this.block = [];
    this.invalidate();
}


function clearActions() {
    actions = [];
};

function setCurrentPiece(piece) {
    current = piece || randomPiece();
    my_blocks.invalidate();
};

function setNextPiece(piece) {
    next = piece || randomPiece();
    invalidateNext();
};

function reset() {
    dt = 0;
    speedRows = 0;
    clearActions();
    my_blocks = new Block();
    op_blocks = new Block();
    clearRows();
    clearGnus();
    clearScore();
    fishtris_pieces = [];
    setCurrentPiece(next);
    setNextPiece();
};

function update(idt) {
    if (playing) {
        if (vscore < score)
            setVisualScore(vscore + 1);
        handle(actions.shift());
        dt = dt + idt;
        if (dt > step) {
            dt = dt - step;
            drop();
        }
    }
};

function handle(action) {
    switch (action) {
        case DIR.LEFT:
            move(DIR.LEFT);
            break;
        case DIR.RIGHT:
            move(DIR.RIGHT);
            break;
        case DIR.UP:
            rotate();
            break;
        case DIR.DOWN:
            drop();
            break;
    }
};

function move(dir) {
    socket.emit("cur", current);
    var x = current.x,
        y = current.y;
    switch (dir) {
        case DIR.RIGHT:
            x = x + 1;
            break;
        case DIR.LEFT:
            x = x - 1;
            break;
        case DIR.DOWN:
            y = y + 1;
            break;
    }
    if (my_blocks.unoccupied(current.type, x, y, current.dir)) {
        current.x = x;
        current.y = y;
        my_blocks.invalidate();
        if (dropall) {
            while (my_blocks.unoccupied(current.type, x, y, current.dir)) {
                y = y + 1;
                current.y = y;
            }
            y = y - 1;
            dt = dt - step;
            current.y = y;
            dropall = false;
        }
        return true;
    } else {
        return false;
    }
};

function rotate(dir) {
    var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
    if (my_blocks.unoccupied(current.type, current.x, current.y, newdir)) {
        current.dir = newdir;
        my_blocks.invalidate();
    }
};

function drop() {
    if (!move(DIR.DOWN)) {
        addScore(10);
        socket.emit('down', {
            type: current.type,
            x: current.x,
            y: current.y,
            dir: current.dir
        });
        dropPiece();
        var n = my_blocks.removeLines();
        if (n > 0) {
            addRows(n);
            addGnus(n);
            addScore(100 * Math.pow(2, n - 1)); // 1: 100, 2: 200, 3: 400, 4: 800
        }
        if (fishtris_pieces.length == 0) {
            setCurrentPiece(next);
            setNextPiece(randomPiece());
        } else {
            setCurrentPiece(fishtris_pieces.pop());
        }
        clearActions();
        if (my_blocks.occupied(current.type, current.x, current.y, current.dir)) {
            lose();
        }
    }
};

function dropPiece() {
    eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
        my_blocks.set(x, y, current.type.color);
    });
};

Block.prototype.removeLines = function() {
    var x, y, complete, n = 0;
    for (y = ny; y > 0; --y) {
        complete = true;
        for (x = 0; x < nx; ++x) {
            if (!this.get(x, y))
                complete = false;
        }
        if (complete) {
            this.removeLine(y);
            console.log("Remove line", y);
            y = y + 1; // recheck same line
            n++;
        }
    }
    return n;
};

Block.prototype.removeLine = function(n) {
    var x, y;
    for (y = n; y >= 0; --y) {
        for (x = 0; x < nx; ++x)
            this.set(x, y, (y == 0) ? null : this.get(x, y - 1));
    }
};

//-------------------------------------------------------------------------
// RENDERING
//-------------------------------------------------------------------------

var invalid = {};

Block.prototype.invalidate = function() {
    this.court = true;
}

Block.prototype.setValid = function() {
    this.court = false;
}

Block.prototype.isInValid = function() {
    return this.court;
}


function invalidateNext() {
    invalid.next = true;
}

function invalidateScore() {
    invalid.score = true;
}

function invalidateRows() {
    invalid.rows = true;
}

function invalidateGnus() {
    invalid.gnus = true;
}

function draw() {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.translate(0.5, 0.5); // for crisp 1px black lines
    drawCourt();
    drawNext();
    drawScore();
    drawRows();
    drawGnus();
    ctx.restore();
};

function drawCourt() {
    if (my_blocks.isInValid()) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (playing)
            drawPiece(ctx, current.type, current.x, current.y, current.dir);
        var x, y, block;
        for (y = 0; y < ny; y++) {
            for (x = 0; x < nx; x++) {
                if (color = my_blocks.get(x, y))
                    drawBlock(ctx, x, y, color);
            }
        }
        ctx.strokeRect(0, 0, nx * dx - 1, ny * dy - 1); // court boundary
        my_blocks.setValid();
    }
};

function drawOpCourt() {
    if (op_blocks.isInValid()) {
        opctx.clearRect(0, 0, canvas.width, canvas.height);
        if (playing)
            drawPiece(opctx, opcurrent.type, opcurrent.x, opcurrent.y, opcurrent.dir);
        var x, y, block;
        for (y = 0; y < ny; y++) {
            for (x = 0; x < nx; x++) {
                if (color = op_blocks.get(x, y))
                    drawBlock(opctx, x, y, color);
            }
        }
        opctx.strokeRect(0, 0, nx * dx - 1, ny * dy - 1); // court boundary
        op_blocks.setValid();
    }
};

function drawNext() {
    if (invalid.next) {
        socket.emit("next", next);
        var padding = (nu - next.type.size) / 2; // half-arsed attempt at centering next piece display
        uctx.save();
        uctx.translate(0.5, 0.5);
        uctx.clearRect(0, 0, nu * dx, nu * dy);
        drawPiece(uctx, next.type, padding, padding, next.dir);
        uctx.strokeStyle = 'black';
        uctx.strokeRect(0, 0, nu * dx - 1, nu * dy - 1);
        uctx.restore();
        invalid.next = false;
    }
};

function drawScore() {
    if (invalid.score) {
        html('score', ("00000" + Math.floor(vscore)).slice(-5));
        invalid.score = false;
    }
};

function drawRows() {
    if (invalid.rows) {
        html('rows', rows);
        invalid.rows = false;
    }
};

function drawGnus() {
    if (invalid.gnus) {
        html('gnus', gnus);
        invalid.gnus = false;
    }
};

function drawPiece(ctx, type, x, y, dir) {
    eachblock(type, x, y, dir, function(x, y) {
        drawBlock(ctx, x, y, type.color);
    });
};

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * dx, y * dy, dx, dy);
    ctx.strokeRect(x * dx, y * dy, dx, dy)
};


//-------------------------------------------------------------------------
// Socket Actions
//-------------------------------------------------------------------------


socket.on('game_ready', function(seed) {
    console.log('game_ready', seed);
    mt = new MersenneTwister(seed);
    pieces = [];
    setNextPiece();
    hide('startinfo');
    show('tetris');

});

socket.on('op_score', function(data) {
    html('scoreop', ("00000" + Math.floor(data)).slice(-5));
});
socket.on('op_rows', function(data) {
    html('rowsop', data);
});
socket.on('op_gnus', function(data) {
    html('gnusop', data);
});

socket.on('op_down', function(data) {
    eachblock(data.type, data.x, data.y, data.dir, function(x, y) {
        console.log('setBlock(', x, y, data.type.id);
        op_blocks.set(x, y, data.type.color);
        drawOpCourt();
        op_blocks.removeLines();
    });
});

socket.on('op_cur', function(data) {
    opcurrent = data;
    op_blocks.invalidate();
    drawOpCourt();

});

socket.on('start', function(data) {
    if (!playing) {
        play();
    }
});
socket.on('op_next', function(next) {
    console.log("op_next" + next.type.id);
    var padding = (nu - next.type.size) / 2; // half-arsed attempt at centering next piece display
    opuctx.save();
    opuctx.translate(0.5, 0.5);
    opuctx.clearRect(0, 0, nu * dx, nu * dy);
    drawPiece(opuctx, next.type, padding, padding, next.dir);
    opuctx.strokeStyle = 'black';
    opuctx.strokeRect(0, 0, nu * dx - 1, nu * dy - 1);
    opuctx.restore();
});

socket.on('op_fishtris', function(id) {
    console.log("op_fishtris " + id);
    fishtrisActions.forEach(function(action) {
        if (action.id == id) {
            action.op_action();
        }
    })
});

//-------------------------------------------------------------------------
// FINALLY, lets run the game
//-------------------------------------------------------------------------
hide('tetris');
run();
