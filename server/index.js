var $app = require('express')();
var $http = require('http').Server($app);
var $io = require('socket.io')($http);
var $MongoClient = require('mongodb').MongoClient;
var $config = require('./config.js');
var $url = require('url');
var $extend = require('./extend.js').extend;
var $db;
var $ns = require('./namespace.js');

$MongoClient.connect($config.db_uri, function (err, db) {
    if (err) {
        log('Cant connect db');
        process.exit();
    }

    $db = db;
    db.collection('app').find().toArray(function (err, docs) {

        start_listen();
    });
});

function start_listen() {
    $http.listen($config.port, function () {
        log('listening on *:' + $config.port);
    });
}

$io.on('connection', function (socket) {
    var app_id = socket.handshake.query.app;
    var secrect = socket.handshake.query.scr;

    socket.on('user.presence', function (user) {
        var user = $extend({}, user);
        if (!user || !user.department || !user.id || !user.department.id) {
            socket.close();
            return;
        }
        socket.user = user;

        function update_department() {
            $db.collection('department').find({'id': user.department.id, 'app_id': app_id}).toArray(function (err, deps) {
                var data = $extend({'app_id': app_id}, user.department);
                if (deps.length)
                    $db.collection('department').updateOne({"id": user.department.id}, {
                        $set: data
                    }).then(update_user);
                else
                    $db.collection('department').insertOne(data).then(update_user);
            });
        }

        function update_user() {
            $db.collection('user').find({'id': user.id, 'app_id': app_id}).toArray(function (err, users) {
                var data = $extend({'app_id': app_id}, user);
                if (users.length)
                    $db.collection('user').updateOne({"id": user.id}, {
                        $set: data
                    });
                else
                    $db.collection('user').insertOne(data);
            });
        }

        //gửi list user
        $db.collection('user').find({'app_id': app_id}).toArray(function (err, users) {
            if (users.length) {
                socket.emit('user.list', users);
            }
        });

        //update department to db
        update_department();

        //gửi trạng thái cửa sổ cho client mới
        var room = $ns.room(app_id, user.id);
        socket.emit('chat.display', room.chat_display || {hide: false, bubbles: [], active: null});

        $ns.namespace(app_id).broadcast('user.presence', user);
        var room = $ns.join(socket, app_id, user.id);

        var sockets = $ns.namespace(app_id).sockets;
        //gửi thông báo online của người khác tới tôi
        for (var soc_id in sockets) {
            var other = sockets[soc_id];
            if (other.user && other.user.id != socket.user.id) {
                socket.emit('user.presence', other.user);
            }
        }
    });

    socket.on('chat.display', function (data) {
        //broadcast to me
        var room = $ns.room(app_id, socket.user.id);
        room.broadcast('chat.display', data, socket);
        //save display to room
        room.chat_display = data;
    });

    socket.on('chat.message', function (msg) {
        msg.date = new Date();
        msg.text = replace_html(msg.text);
        msg.from = socket.user.id;
        //broadcast to clone of me
        $ns.room(app_id, msg.from).broadcast('chat.message', msg);
        //broadcast to other
        $ns.room(app_id, msg.to).broadcast('chat.message', msg);
    });
});

function presence_update() {
    for (var i in $ns.namespaces) {
        var ns = $ns.namespaces[i];
        for (var j in ns.rooms) {
            var room = ns.rooms[j];
            for (var k in room.sockets) {
                if (room.sockets[k].user) {
                    ns.broadcast('user.presence', room.sockets[k].user);
                    break;
                }
            }
        }
    }
}

//broadcast user presence
setInterval(presence_update, 30000);

function replace_html(text) {
    return text.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}

function log(msg) {
    console.log(msg);
}

function is_empty(obj) {
    for (var i in obj)
        return false;
    return true;
}