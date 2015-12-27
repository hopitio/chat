<div id="_fc-float" ng-class="<?php echo "{'_fc-hide': hide}" ?>">
    <div class="_fc-btn _fc-btn-main _fc-shadow" ng-click="start_chat(null)">
        <span class="_fc-active" ng-if="!chat_bubble_active"></span>
        <i class="_fc-icons">message</i>
    </div>
    <div class="_fc-btn  " ng-repeat="uid in chat_bubbles" ng-click="start_chat(users[uid])" title="{{user.name}}">
        <div class="_fc-btn-user _fc-shadow">
            <div class="_fc-avatar">
                <img ng-if="users[uid].avatar" ng-src="{{users[uid].avatar}}"/>
                <span ng-if="!users[uid].avatar">{{abbreviation(users[uid].name)}}</span>
            </div>
            <span class="_fc-active" ng-if="chat_bubble_active == uid"></span>
        </div>
    </div>
    <div class="_fc-window ">
        <div class="_fc-body _fc-shadow">
            <div class="_fc-tab-user" ng-if="!chat_bubble_active">
                <div class="_fc-list" ng-if="!search">
                    <div ng-repeat="department in deps" class="_fc-department-container">
                        <div class="_fc-department">{{department.name}} ({{len(department.users)}})</div>
                        <div class="_fc-user" ng-repeat="user in department.users" ng-click="start_chat(user)">
                            <div class="_fc-avatar">
                                <img ng-if="user.avatar" ng-src="{{user.avatar}}"/>
                                <span ng-if="!user.avatar">{{abbreviation(user.name)}}</span>
                            </div>
                            <div class="_fc-status" ng-class="<?php echo "{online: is_online(user), offline: !is_online(user)}" ?>"><span></span></div>
                            <div class="_fc-name">{{user.name}}</div>
                            <div class="_fc-last-msg">{{user.title}}</div>
                        </div>
                    </div>
                </div>

                <div class="_fc-list" ng-if="search">
                    <div class="_fc-user" ng-repeat="user in users" ng-click="start_chat(user)" ng-if="search_filter(user)">
                        <div class="_fc-avatar">
                            <img ng-if="user.avatar" ng-src="{{user.avatar}}"/>
                            <span ng-if="!user.avatar">{{abbreviation(user.name)}}</span>
                        </div>
                        <div class="_fc-status" ng-class="<?php echo "{online: is_online(user), offline: !is_online(user)}" ?>"><span></span></div>
                        <div class="_fc-name" ng-bind-html="search_highlight(user.name)"></div>
                        <div class="_fc-last-msg">{{user.title}}</div>
                    </div>
                </div>

                <input type="text" class="_fc-search" placeholder="tìm kiếm" tabindex="-1" ng-model="search">
            </div>
            <div class="_fc-messages" ng-if="chat_bubble_active">
                <div class="_fc-messages-inner">
                    <div class="_fc-header">
                        <span ng-if="is_online(users[chat_bubble_active])" class="_fc-status _fc-online"></span>
                        {{users[chat_bubble_active].name}}
                        <div class="_fc-actions">
                            <i class="_fc-icons tiny" title="Trao đổi nhóm">playlist_add</i>
                            <i class="_fc-icons tiny" title="Gọi hình">videocam</i>
                            <i class="_fc-icons tiny" title="Gọi tiếng">phone</i>
                        </div>
                    </div>
                    <div class="_fc-container" ng-dom="div_messages">
                        <?php
                        $class = '{
                            \'_fc-mine\': message.from==user.id, 
                            \'_fc-other\': message.from!=user.id,
                            \'_fc-sbl-prev\': message.from==users[chat_bubble_active].messages[$index-1].from,
                            \'_fc-sbl-next\': message.from==users[chat_bubble_active].messages[$index+1].from
                        }';
                        ?>
                        <div class="_fc-message" ng-repeat="message in users[chat_bubble_active].messages" ng-class="<?php echo $class ?>">
                            <div ng-if="message.from != user.id" class="_fc-avatar">
                                <img ng-src="{{users[chat_bubble_active].avatar}}" ng-if="users[chat_bubble_active].avatar"/>
                                <span class="_fc-no-avatar" ng-if="!users[chat_bubble_active].avatar"></span>
                            </div>
                            <div class="_fc-message-text" ng-bind-html="message.text" title="{{show_date(message.date)}}"></div>
                            <div class="_fc-clear"></div>
                        </div>
                    </div>
                    <input type="text" placeholder="viết tin nhắn" class="_fc-new-msg" ng-keyup="msg_onkeyup($event)" >
                </div>
            </div>
            <div class="_fc-tabs">
                <div class="_fc-tab _fc-active" title="Danh sách đầy đủ">
                    <i class="_fc-icons">supervisor_account</i>
                </div>
                <div class="_fc-tab" title="Cuộc trò chuyên gần đây">
                    <i class="_fc-icons">schedule</i>
                </div>
                <div class="_fc-tab" title="Ẩn cửa sổ" ng-click="toggle_show()">
                    <i class="_fc-icons">system_update_alt</i>
                </div>

                <!--                <div class="_fc-tab" title="Tùy chỉnh">
                                    <i class="_fc-icons">settings</i>
                                </div>-->
            </div>
        </div>
    </div>
</div>
