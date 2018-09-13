// image转Blob
function imageToBlob(src, cb){
    var img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d');
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(function(blob){ cb(URL.createObjectURL(blob)); });
    }
    img.src = src;
}

//创建右键菜单组件
var epMenu = {
    create: function(e,items){
        var $menu = $("#epMenu").css({ left: e.clientX+'px', top: e.clientY+'px' }).html(null).show();
        for(var i=0,len=items.length; i<len; i++){
            var $item = $("<a></a>").text(items[i].name).on('click',function(){
                typeof(this.action)=="function" ? this.action() : null;
                $menu.hide();
            }.bind(items[i]));
            $menu.append($item);
        }
    },
    destory: function(){
        $("#epMenu").hide().remove();
    }
};

//获取分类

// 程序入口
$(document).ready(function() {
    var rippleEle = $('#ripple').ripples({ arbitrary:10, resolution: 850, dropRadius: 10, perturbance: 0.02, crossOrigin: 'anonymous' })[0];
    var items = [
        {name:'更换壁纸','action':function(){ $("#file").trigger("click"); }},
        {name:'暂停/播放','action':function(){ $("#pause").trigger("click"); }},
        {name:'隐藏/显示','action':function(){ $("#show").trigger("click"); }}
    ];
    $(rippleEle).on("mousedown", function(e){
        e.which==2 ? epMenu.create(e, items) : null;
        return false;
    }).on("click contextmenu",function(){
        $("#epMenu").hide();
    });
    $("#file").on("change",function(){
        var src = URL.createObjectURL(this.files[0]);
        $(rippleEle).ripples("set","imageUrl",src).css("background-image", template.render("url({{src}})", { src: src }) );
    });
    $("#show").on("click",function(){
        $(this).val(rippleEle.isHide?"隐藏":"显示");
        $(rippleEle).prop("isHide",!rippleEle.isHide).ripples(rippleEle.isHide?"hide":"show");
    });
    $("#pause").on("click",function(){
        $(this).val(rippleEle.isStop?"暂停":"播放");
        $(rippleEle).prop("isStop",!rippleEle.isStop).ripples(rippleEle.isStop?"pause":"play");
    });
    $("#destroy").on("click",function(){
        $("#pause,#show,#destroy").remove();
        $(rippleEle).ripples("pause").ripples("hide").ripples("destroy");
        delete rippleEle.isStop,rippleEle.isHide;
    });
});