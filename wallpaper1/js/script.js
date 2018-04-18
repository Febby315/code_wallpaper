var strings = [
    {style:{top:"15%",left:"50%" },html:"运营的走开，不要和我说需求"},
    {style:{top:"25%",left:"30%"},html:"看见<span>需求</span>的我内心是崩溃的"},
    {style:{top:"27%",left:"70%"},html:"<span>KBI</span>完成没？PBC写了没？"},
    {style:{top:"35%",left:"15%"},html:"要大气，要简洁"},
    {style:{top:"36%",left:"40%"},html:"<span>通宵</span>可以建立最稳固的同事友谊"},
    {style:{top:"40%",left:"75%"},html:"吃了夜宵你好意思不通宵？"},
    {style:{top:"50%",left:"50%",fontSize:"2.2em"},html:"代码没写完，哪有<span style='color:#fb0;'> 脸 </span>睡觉"},
    {style:{top:"60%",left:"25%"},html:"体验，体验，注意用户体验！"},
    {style:{top:"65%",left:"65%"},html:"产品经理站在后面是非常<span>不道德</span>的"},
    {style:{top:"70%",left:"26%"},html:"不吃饭不睡觉不回家，任务没完成别走"},
    {style:{top:"75%",left:"65%"},html:"来瓶红牛，决战到天亮"},
    {style:{top:"80%",left:"48%"},html:"我要裸着写代码，这样很轻松！"},
    {style:{top:"85%",left:"85%"},html:"<p style='color:#fb0;'><span>牢记</span><br>下班要打卡<p>"}
];
$(document).ready(function(){
    var $view = $("#view");
    strings.forEach(function(item){
        $view.append($("<div></div>").css(item.style).html(item.html));
    });
});