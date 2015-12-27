var namespaces = {};
var gb_time = 1000;

exports.namespaces = namespaces;

function is_empty(obj) {
    for (var i in obj)
        return false;
    return true;
}

function Namespace(id) {
    var self = this;
    self.id = id;
    self.rooms = {};
    self.sockets = {};

    self.room = function (id) {
        return self.rooms[id] ? self.rooms[id] : new Room(id);
    };

    self.broadcast = function (event, data, except) {
        for (var i in self.sockets)
            if (!except || except.id != self.sockets[i].id)
                self.sockets[i].emit(event, data);
    };

    self.join = function (socket) {
        if (self.sockets[socket.id])
            return;
        //luu socket vao namespace
        self.sockets[socket.id] = socket;

        socket.on('disconnect', function () {
            self.leave(socket);
        });
    };

    self.join_room = function (socket, r_id, on_room_create) {
        var room = self.create_room(r_id, on_room_create);
        self.join(socket);
        room.join(socket);
        return room;
    };

    self.leave = function (socket) {
        setTimeout(function () {
            //don socket khoi namespace
            if (self.sockets[socket.id])
                delete self.sockets[socket.id];
            //xoa namespace neu trong
            if (is_empty(self.sockets))
                delete namespaces[self.id];
        }, gb_time);
    };

    self.create_room = function (id, on_room_create) {
        if (self.rooms[id])
            return self.rooms[id];
        var room = self.rooms[id] = new Room(self.ns_id, id, on_room_create);
        return room;
    };

}

function Room(ns_id, r_id, on_create) {
    var self = this;
    self.id = r_id;
    self.ns_id = ns_id;
    self.sockets = {};
    self.intervals = [];

    self.broadcast = function (event, data, except) {
        for (var i in self.sockets)
            if (!except || except.id != self.sockets[i].id)
                self.sockets[i].emit(event, data);
    };

    self.join = function (socket) {
        if (self.sockets[socket.id])
            return;
        self.sockets[socket.id] = socket;
        socket.on('disconnect', function () {
            self.leave(socket);
        });
    };

    self.leave = function (socket) {
        setTimeout(function () {
            //don socket khoi room
            if (self.sockets[socket.id])
                delete self.sockets[socket.id];
            //xoa room neu trong
            if (is_empty(self.sockets)) {
                delete exports.namespace(self.ns_id).rooms[self.id];
                //clear intervals
                for (var i in self.intervals) {
                    clearInterval(self.intervals[i]);
                }
                self.intervals = [];
            }
        }, gb_time);
    };

    self.set_interval = function (fn, time) {
        var inv = setInterval(fn, time);
        self.intervals.push(inv);
        return inv;
    };

    if (on_create)
        on_create.apply(self, [self]);
}

exports.namespace = function (id) {
    return namespaces[id] ? namespaces[id] : new Namespace(id);
};

exports.room = function (ns_id, r_id) {
    var ns = exports.namespace(ns_id);
    return ns.room(r_id);
};

exports.join = function (socket, ns_id, r_id, on_room_create) {
    var ns = namespaces[ns_id];
    if (!ns)
        ns = namespaces[ns_id] = new Namespace(ns_id);

    return ns.join_room(socket, r_id, on_room_create);
};

