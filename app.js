(function (window, document) {

    function create_module() {
        var module = window.angular.module('FineChat', []);
        return module;
    }

    function create_service_io(module, io) {
        module.factory('$io', ['$rootScope', function ($rootScope) {
                var socket;
                var exports = {};

                exports.connect = function (uri, cfg) {
                    socket = io.connect(uri, cfg);
                    return this;
                };

                exports.emit = function (event, data, callback) {
                    if (callback)
                        socket.emit(event, data, function (ack) {
                            setTimeout(function () {
                                $rootScope.$apply(function () {
                                    callback(ack);
                                });
                            });
                        });
                    else
                        socket.emit(event, data);
                };

                exports.message = function (type, to, data, callback) {
                    exports.emit('message', {
                        type: type,
                        to: to,
                        data: data
                    }, callback);
                };

                exports.on = function (event, callback) {
                    socket.on(event, function (data) {
                        setTimeout(function () {
                            $rootScope.$apply(function () {
                                callback(data);
                            });
                        });
                    });
                };

                return exports;
            }]);
    }

    function create_service_apply(module) {
        module.factory('$apply', ['$rootScope', function ($rootScope) {
                return function (fn) {
                    fn = fn || new Function();
                    setTimeout(function () {
                        $rootScope.$apply(function () {
                            fn();
                        });
                    });
                };
            }]);
    }

    function create_controller(module, cfg) {
        module.controller('chatCtrl', ['$scope', '$timeout', '$apply', '$io', '$sce', function ($scope, $timeout, $apply, $io, $sce) {
                $scope.user = cfg.user;
                $scope.deps = {};
                $scope.users = {};
                $scope.chat_bubbles = [];
                $scope.chat_bubble_active;
                $scope.typing;
                $scope.now;
                $scope.hide = false;

                $scope.toggle_show = function () {
                    $scope.hide = $scope.hide ? false : true;
                    sync_display();
                };

                $scope.len = function (obj) {
                    var len = 0;
                    for (var i in obj)
                        len++;
                    return len;
                };
                $io.connect(cfg.socket_address, {
                    query: 'app=' + cfg.app_id + '&scr=' + cfg.secrect,
                    resource: "socket.io"
                });

                $io.on('connect', function () {
                    $io.emit('user.presence', cfg.user);
                    bind_io();
                    bind_io = new Function();
                });

                function bind_io() {
                    $io.on('user.presence', on_user_presence);
                    $io.on('user.offline', on_user_offline);
                    $io.on('chat.display', on_chat_display);
                    $io.on('chat.message', on_chat_message);
                }

                function update_now() {
                    $scope.now = new Date();
                    //chay lien tuc sao 30s
                    $timeout(update_now, 1000 * 30);
                }
                update_now();

                function on_user_presence(user) {
                    if (user.id == cfg.user.id)
                        return;

                    $scope.deps[user.department.id] = extend($scope.deps[user.department.id] ? $scope.deps[user.department.id] : {}, user.department);

                    var dep = $scope.deps[user.department.id];
                    if (!dep.users) {
                        dep.users = {};
                    }

                    dep.users[user.id] = extend(dep.users[user.id] ? dep.users[user.id] : {}, user);
                    $scope.users[user.id] = dep.users[user.id];
                }

                function on_user_offline(user) {
                    var dep = $scope.deps[user.department.id];
                    if (!dep || !dep.users)
                        return;
                    delete dep.users[user.id];
                    delete $scope.users[user.id];

                    if (is_empty(dep.users))
                        delete $scope.deps[dep.id];
                }

                function on_chat_display(data) {
                    $scope.hide = data.hide;
                    for (var i in data.bubbles) {
                        var bb = data.bubbles[i];
                        if (!$scope.deps[bb.department.id])
                            $scope.deps[bb.department.id] = extend({'users': {}}, bb.department);
                        if (!$scope.users[bb.id])
                            $scope.users[bb.id] = bb;
                        $scope.users[bb.id].messages = bb.messages;
                    }
                    if (data.active) {
                        $scope.chat_bubble_active = $scope.users[data.active.id];
                        $scope.users[data.active.id].messages = data.active.messages;
                    } else {
                        $scope.chat_bubble_active = null;
                    }
                }

                function on_chat_message(msg) {
                    var you;
                    if (msg.from == $scope.user.id)
                        you = msg.to;
                    else if (msg.to == $scope.user.id)
                        you = msg.from;
                    else
                        return;

                    var user = $scope.users[you];
                    if (!user)
                        return;

                    msg.date = new Date(msg.date);
                    msg.text = $sce.trustAsHtml(msg.text);
                    if (!user.messages)
                        user.messages = [];
                    user.messages.push(msg);
                }

                $scope.start_chat = function (user) {
                    if ($scope.hide)
                        $scope.hide = false;
                    $scope.chat_bubble_active = user;
                    if (user) {
                        var chat_bubbles = $scope.chat_bubbles;
                        var index = -1;
                        for (var i in chat_bubbles) {
                            var item = chat_bubbles[i];
                            if (user.id == item.id) {
                                index = i;
                                break;
                            }
                        }
                        //khong tim thay thi append
                        if (index == -1) {
                            chat_bubbles.splice(0, 0, user);
                            //nếu quá số lượng xóa người xa nhất
                            if (chat_bubbles.length >= 5)
                                chat_bubbles.splice(4, 1);
                        }
                    }

                    sync_display();
                };

                function sync_display() {
                    $io.emit('chat.display', {
                        'bubbles': $scope.chat_bubbles,
                        'active': $scope.chat_bubble_active,
                        'hide': $scope.hide
                    });
                }

                $scope.abbreviation = function (name) {
                    var match = name.match(/( .)/ig);
                    var ret = name[0] + match.join('');
                    return ret.replace(/ /g, '').toUpperCase();
                };

                $scope.msg_onkeyup = function ($event) {
                    var val = $scope.typing = $event.target.value;
                    if ($event.keyCode == 13 && val) {
                        $scope.typing = '';
                        $event.target.value = '';
                        $scope.send_message(val);
                    }
                };

                $scope.send_message = function (text) {
                    if (!$scope.chat_bubble_active)
                        return;

                    var msg = {
                        'to': $scope.chat_bubble_active.id,
                        'text': text
                    };
                    $io.emit('chat.message', msg);
                };

                $scope.show_date = function (date) {
                    if (typeof date == 'String')
                        date = new Date(date);
                    var gap = Math.round(($scope.now.getTime() - date.getTime()) / 1000);
                    var week_days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

                    if (gap < 60)
                        return 'Vừa gửi';
                    if (gap < 3600)
                        return Math.round(gap / 60) + ' phút trước';
                    if (gap < 3600 * 24)
                        return Math.round(gap / 3600) + '  giờ trước';
                    if (gap < 3600 * 24 * 7)
                        return week_days[date.getDay()] + ' ' + date.getHours() + ':' + date.getMinutes();
                    return date.getDate() + ' tháng ' + (date.getMonth() + 1) + ' ' + date.getHours() + ':' + date.getMinutes();
                };


                $scope.$watch('chat_bubble_active.messages.length', function (new_val) {
                    var div_msgs = document.getElementsByClassName('_fc-container');

                    if (!div_msgs.length || !new_val)
                        return;

                    var last_msg = $scope.chat_bubble_active.messages[$scope.chat_bubble_active.messages.length - 1];

                    div_msgs = div_msgs[0];
                    if (div_msgs.scrollHeight - div_msgs.scrollTop - div_msgs.clientHeight <= 20 || last_msg.from == $scope.user.id)
                        $timeout(function () {
                            div_msgs.scrollTop = div_msgs.scrollHeight;
                        });
                });

            }]); //ctrl

    } //fn

    //nếu không có thư viện jquery khai báo hàm extend
    if (typeof jQuery != 'undefined')
        var extend = function (a, b) {
            return jQuery.extend(a, b);
        };
    else
        var extend = function () {
            var a, b, c, d, e, f, g = arguments[0] || {}, h = 1, i = arguments.length, j = !1;
            for ("boolean" == typeof g && (j = g, g = arguments[h] || {}, h++), "object" == typeof g || m.isFunction(g) || (g = {}), h === i && (g = this, h--); i > h; h++)
                if (null != (e = arguments[h]))
                    for (d in e)
                        a = g[d], c = e[d], g !== c && (j && c && (m.isPlainObject(c) || (b = m.isArray(c))) ? (b ? (b = !1, f = a && m.isArray(a) ? a : []) : f = a && m.isPlainObject(a) ? a : {}, g[d] = m.extend(j, f, c)) : void 0 !== c && (g[d] = c));
            return g
        };

    function is_empty(obj) {
        for (var i in obj)
            return false;
        return true;
    }


    function FineChat(script_src) {
        var self = this;
        self.cfg = null;
        self.theme_root = null;
        self.script_loaded = 0;
        self.scripts = {
            'angular': 'angular.min.js',
            'io': 'socket.io.js'
        };
        self.styles = ['style.css'];

        function load_scripts() {
            var len = 0;
            for (var i in self.scripts) {
                len++;
                (function () {
                    if (window[i])
                        return;
                    var s = document.createElement('script');
                    s.src = self.theme_root + '/js/' + self.scripts[i];
                    document.body.appendChild(s);
                    s.onload = s.onreadystatechange = function () {
                        self.script_loaded++;
                        if (self.script_loaded == len)
                            script_ready();
                    };
                })();
            }
        }

        function load_styles() {
            var len = 0;
            for (var i in self.styles) {
                len++;
                (function () {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.type = 'text/css';
                    link.href = self.theme_root + '/css/' + self.styles[i];
                    document.head.appendChild(link);
                })();
            }
        }

        function append_template() {
            var d = document.createElement('div');
            var url = self.theme_root + '/html/main.php';
            d.innerHTML = '<div ng-app="FineChat" ng-controller="chatCtrl" ><div ng-include="\'' + url + '\'"></div></div>';
            document.body.appendChild(d);
        }

        self.config = function (cfg) {
            self.cfg = extend({
                'socket_address': 'localhost:3000'
            }, cfg);
            //parse url
            var parts = script_src.split('/');
            parts.splice(parts.length - 1, 1);
            self.theme_root = parts.join('/') + '/client/' + self.cfg.theme;
            self.cfg.theme_root = self.theme_root;
            append_template();
            load_styles();
            load_scripts();
        };

        function script_ready() {
            var angular = window.angular;
            var io = window.io;
            var module = create_module();
            //$io
            create_service_io(module, io);
            //$apply
            create_service_apply(module);
            //chatCtrl
            create_controller(module, self.cfg);
        }


    }

    var script = document.getElementById('fine-chat-js');
    window.FineChat = new FineChat(script.src);
    if (window.onFineChatReady)
        window.onFineChatReady(window.FineChat);

})(window, document);

