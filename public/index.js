$(document).ready(function () {
    $("#create-room").click(function(){
        $(".modal").addClass("is-active");
    });
    $(".modal-background, .delete").click(function(){
        $(".modal").removeClass("is-active");
    });
    $("#searchInput").on("input", checkRooms);
    function checkRooms() {
        // Declare variables
        var input, filter;
        input = document.getElementById('searchInput');
        filter = input.value.toUpperCase();
        // Loop through all list items, and hide those who don't match the search query
        html = ""
        for (i = 0; i < rooms.length; i++) {
            if(rooms[i].realroomname.toUpperCase().indexOf(filter) > -1){
                html += `<div class="column is-3 room-links">
                <a class="room-link" href="/room/` + rooms[i].roomname + `">
                    ` + rooms[i].realroomname + `
                </a>
            </div>`
            }
        }
        $("#roomList").empty();
        $("#roomList").append(html);
    }
});