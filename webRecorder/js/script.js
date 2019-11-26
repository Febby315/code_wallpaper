// 入口
$(document).ready(function(e){
    var recorder = window.recorder = new WebRecord();
    // 控制器事件监听
    $("#start").on("click",function(e){
        recorder.start();
    });
    $("#stop").on("click",function(e){
        recorder.stop();
    });
    $("#play").on("click",function(e){
        recorder.play();
    });
    $("#save").on("click",function(e){
        recorder.save();
    });
    $("#add").on("click",function(e){
        var hash = "";
        for (var j=0;j<40;j++){ 
            hash+= ~~(Math.random()*2) ? String(~~(Math.random()*10)) : String.fromCharCode(~~(65+Math.random()*6));
        }
        $("#view").append($(["<div>",hash,"</div>"].join(""))[0]);
    });
});