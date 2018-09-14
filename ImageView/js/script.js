function fullPage(delta, eh) {
    //$(ele).animate({top:-eh});
    var tempSpend = 0, tempCurrH = 0;
    var timer = setInterval(function () {
        tempSpend = tempCurrH + tempSpend > eh ? eh - tempCurrH : tempSpend;
        tempCurrH += tempSpend;
        this.scrollTop += delta > 0 ? tempSpend : -tempSpend;
        tempCurrH >= eh ? clearInterval(timer) : tempSpend += 2;
    }.bind(this), 20);
}
$(document).ready(function () {
    //滚动事件
    $(".fullpage").on("mousewheel DOMMouseScroll", function (e) {
        var delta = -e.originalEvent.wheelDelta || e.originalEvent.detail;
        var eh = this.clientHeight,ew = this.clientWidth;
        this.scrollTop += delta > 0 ? eh : -eh;   //无动画滚屏
        // fullPage.call(this,delta,eh);  //缓慢动画滚屏
    });
    //判断元素是否在视野内
    function isWithinView($el) {
        var winW = $(window).height(), winH = $(window).height();   //获取窗口宽度 //获取窗口高度
        var scrollW = $(window).scrollLeft(), scrollH = $(window).scrollTop();  //获取窗口滚动宽度 //获取窗口滚动高度
        var left = $el.offset().left, top = $el.offset().top;   //获取元素距离窗口左边界偏移量 //获取元素距离窗口顶边界偏移量
        return left < winW + scrollW && top < scrollH + winH;   //在可视范围内
    }
    //图片懒加载
    function lazyload() {
        //检查包含data-src而不包含src属性的img元素
        $('img[data-src]:not([src])').each(function () {
            //判断图片未被加载且在可视区时加载图片并标记为已加载
            var $img = $(this);
            !$img.prop('isLoaded') && isWithinView($img) ? $img.attr('src', $img.attr('data-src')).prop('isLoaded', true) : null;
        });
    }
    //懒加载事件监听
    lazyload();
    $("body").on("scroll",lazyload);
    $(window).on("resize",lazyload);
    //全屏
    $(".pic-view").on("click",function(){
        fullscreen(this);
        //fullscreen("iframeView",this.innerHTML);
    });
});