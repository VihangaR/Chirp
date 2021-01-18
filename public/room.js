$(document).ready(function() {
    var socket = io();
    var userScroll = new SimpleBar($('#user-list')[0]);
    var messageScroll = new SimpleBar($('#messages')[0]);
    messageScroll.getScrollElement().scrollTop = 1E10;
    socket.emit("joined-room", {handle: handle, roomName: roomName});
    $("form").submit(function(){
        if($("#m").val()){
            var msg = {
                handle: handle,
                msg: $("#m").val()
            }
            socket.emit("chat-message", msg);
            $("#m").val("");
            return false;
        } else {
            return false;
        }
    });
    socket.on('chat-message', function(data){
        $("#messages").find(".simplebar-content").append("<div class='msgLine'><b>" + data.handle + "</b>: " + data.msg);
        messageScroll.getScrollElement().scrollTop = 1E10;
    });
    socket.on("initial-list", function(data){
        let html = ""
        for(i = 0; i < data.length; i++){
            html += '<div class="user-list-item" id="' + data[i] + '">' + data[i] + '</div>';
        }
        $("#user-list").find(".simplebar-content").append(html);
    });
    socket.on("delete-user", function(handle){
        $("#" + handle).remove();
    });
    socket.on("add-user", function(handle){
        $("#user-list").find(".simplebar-content").append('<div class="user-list-item" id="' + handle + '">' + handle + '</div>');
    });
});