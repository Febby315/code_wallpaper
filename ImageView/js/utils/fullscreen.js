/**
 * fullscreen
 * version 1.0.0
 * author Febby315
 * explain 这是一个基于jquery的简单全屏脚本,将自动注册到jquery和window
 * window.fullscreen(ele string||object,src string)
 * jQuery.fullscreen(ele string||object,src string)
 * ele参数可以是一个dom元素的id值也可以是一个dom元素
 * src是需要全屏的目标链接
*/
//打开全屏
window.launchFullscreen = function(ele) {
    ele.requestFullscreen?ele.requestFullscreen():
        ele.mozRequestFullScreen?ele.mozRequestFullScreen():
            ele.webkitRequestFullscreen?ele.webkitRequestFullscreen():
                ele.msRequestFullscreen?ele.msRequestFullscreen():
                    console.log("浏览器不支持全屏");
}
//退出全屏
window.exitFullscreen = function() {
    document.exitFullscreen?document.exitFullscreen():
        document.msExitFullscreen?document.msExitFullscreen():
            document.webkitExitFullscreen?document.webkitExitFullscreen():
                document.mozCancelFullScreen?document.mozCancelFullScreen():
                    console.log("浏览器不支持退出全屏");
}
//注册监听全屏事件
window.onFullscreenChange=function(e) {
    var ele = document.fullscreenElement||document.mozFullScreenElement||document.webkitFullscreenElement||document.msFullscreenElement||null;
    var isFull = document.fullscreenEnabled||document.mozFullScreenEnabled||document.webkitFullscreenEnabled||document.msFullscreenEnabled||false;
    isFull&&ele?(window.onFullscreenOpen?window.onFullscreenOpen(e):null):(window.onFullscreenClose?window.onFullscreenClose(e):null);
}
$(document).on("fullscreenchange mozfullscreenchange webkitfullscreenchange msfullscreenchange",onFullscreenChange);

//主入口
(function(){
    //需要jQuery支持
    if(!jQuery) { console.log("全屏插件需要jquery库支持"); return;}
    //清理DOM节点并退出全屏
    function clearFull(){ exitFullscreen(); jQuery("#iframe,#closebut").remove(); }
    //绑定进入全屏事件处理函数
    window.onFullscreenOpen=function(e){
        console.log("进入全屏事件",e);
    };
    //绑定退出全屏事件处理函数
    window.onFullscreenClose=function(e){
        console.log("退出全屏事件",e);
        clearFull();
    };
    //fullscreen(ele,[src])
    //ele:需要全屏的对象(支持DOM元素/节点id),src:全屏的内容(支持URL/HTML)
    //注册为全局方法&jquery的方法
    var fullscreen = jQuery.fullscreen = window.fullscreen = function(ele,src){
        if(!ele){ return; }
        var _self = typeof(ele)=="object"?ele:document.getElementById(ele);
        //初始化DOM节点并全屏
        (function initFull(){
            var $iframe=_self.$iframe = jQuery("<iframe></iframe>").attr("id","iframe").attr("frameborder","0");
            $iframe.css({ "position":"absolute","top":0,"left":0,"width":"100%","height":"100%","z-index":99 });
            var $closebut=_self.$closebut = jQuery("<a>x</a>").attr("id","closebut");
            $closebut.css({ "position":"absolute","right":10,"top":10,"width":"28px","height":"28px","z-index":999,"line-height":"24px","text-align":"center","font-size":"24px","color":"#fff","background":"#3f1","border-radius":"50%","opacity":0.75 });
            src?$(_self).append($iframe.attr(/^(http|\/\/|\.\/|\.\.\/|[a-z0-9])/gm.test(src.toString())?"src":"srcdoc",src)):delete _self.$iframe;
            $(_self).append($closebut);
            $closebut.on("click",clearFull);
            window.launchFullscreen(_self);
        })();//自执行
        return _self;
    }
})();

