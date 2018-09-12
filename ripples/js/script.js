//创建右键菜单组件
var epMenu={
    create:function(point,option){
        var $menu = $("#epMenu");
        if(!$menu.length){
            //没有菜单节点的时候创建一个
            $menu = $("<div></div>").attr('id','epMenu').attr('class','epMenu').css({left:point.left+'px',top:point.top+'px'});
            $("body").append($menu);
        }else $menu.html('');//清空里面的内容
        
        for(var x in option){
            var $ta=$("<a></a>").text(option[x]['name']).on('click',function(){
                this.action?this.action():null;
                $(".epMenu").remove();
            }.bind(option[x]));
            $menu.append($ta);
        }
    },
    destory:function(){
        $(".epMenu").remove();
    }    
};

// 程序入口
$(document).ready(function() {
    function getObjectURL(file) {
        return window.createObjcectURL?window.createObjcectURL(file):
            window.URL&&window.URL.createObjectURL?window.URL.createObjectURL(file):
                window.webkitURL&&window.webkitURL.createObjectURL?window.webkitURL.createObjectURL(file):
                    null;
    }
    var rippleEle = $('#ripple').ripples({
        arbitrary:10,
        resolution: 850,
        dropRadius: 10,
        perturbance: 0.02
    })[0];
    $(rippleEle).bind("mousedown", function(e){
        e.which==2?epMenu.create({left:e.clientX,top:e.clientY},[
            {name:'更换壁纸','action':function(){ $("#file").trigger("click"); }},
            {name:'暂停/播放','action':function(){ $("#pause").trigger("click"); }},
            {name:'隐藏/显示','action':function(){ $("#show").trigger("click"); }}
        ]):null;
        return false;
    }).on("click contextmenu",function(){
        $(".epMenu").remove();
    });
    $("#file").on("change",function(){
        var fileurl=getObjectURL(this.files[0]);
        $(rippleEle).css({'background-image':'url('+fileurl+')'});
        $(rippleEle).ripples("set","imageUrl",fileurl);
    });
    $("#show").on("click",function(){
        $(this).val(rippleEle.isHide?"隐藏":"显示");
        $(rippleEle).prop("isHide",!rippleEle.isHide).ripples(rippleEle.isHide?"hide":'show');
    });
    $("#pause").on("click",function(){
        $(this).val(rippleEle.isStop?"暂停":"播放");
        $(rippleEle).prop("isStop",!rippleEle.isStop).ripples(rippleEle.isStop?"pause":'play');
    });
    $("#destroy").on("click",function(){
        $("#pause,#show,#destroy").remove();
        $(rippleEle).ripples("pause").ripples("hide").ripples("destroy");
        delete rippleEle.isStop,rippleEle.isHide;
    });
});