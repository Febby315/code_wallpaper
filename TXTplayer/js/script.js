// 利用vue虚拟DOM技术加速DOM节点数据渲染
var v_app = new Vue({
    el: "#app",
    data: {
        content:
            "<div class='help'>" +
            "字符画显示区域<br>" +
            "1.目录下start.bat文件<br/>" +
            "2.点击对话框中'允许'按钮<br/>" +
            "3.打开浏览器<br/>" +
            "4.地址栏输入http://127.0.0.1<br/>" +
            "5.按下<span>回车</span><br/>" +
            "6.点击选择文件按钮,选择一个mp4文件<br/>" +
            "7.点击播放/暂停按钮" +
            "</div>"
    },
    mounted: function () {
        this.$nextTick(function () {
            // 初始化结束后
        });
    },
    methods: {}
});
// 配置灰度字符映射表
var charMap = getCharsMap();
function getCharsMap() {
    var map = {}, chars = ['@', '#', '$', 'w', 'k', 'd', 't', 'i', ':', '.', '&nbsp;'];
    var step = ~~(256/(chars.length-1));  //映射步长=最大字符长度/映射字符长度
    for (var i = 0; i < 256; i++) {
        map[i] = chars[~~(i / step)];
    };
    return map;
}
// 图像转字符画
function toChars(context, width, height, rowChars) {
    var videoScale = width/height;//判断视频方向 >1宽屏 =1方屏 <1窄屏
    var screenScale = $(document).width()/$(document).height();//判断屏幕方向 >1宽屏 =1方屏 <1窄屏
    // var zoomScale = screenScale>videoScale ? height/$(document).height() : width/$(document).width(); //获取视频填充缩放比=屏幕宽高比>视频宽高比?高度缩放比:挎包都缩放比
    var fontSize = ~~($("#app").css("font-size").replace("px","")), lineHeight = ~~($("#app").css("line-height").replace("px",""));// 获取容器字体大小&行高
    
    var frame = "",imageData = context.getImageData(0, 0, width, height),
        cols = screenScale>videoScale ? $(document).height()/15 : $(document).width()/7, //字符画宽度=宽屏?按高度自适应:按宽度自适应;
        // cols = width < rowChars ? width : rowChars, // 获取列数=视频宽度<默认字符画宽度:视频宽度:默认字符画宽度 //(如果视频宽度小于默认字符画宽度则以视频宽度为准))
        // cols = $(document).width()/7;
        char_w = char_h = width / cols, // 获取字符画缩放比=视频宽度/字符画宽度 //按视频宽度获取字符画的缩放比例 (宽高缩放比保持一致(防止变形))
        rows = height / char_h; // 获取行数
    // 计算一个像素区域的平均灰度值
    var getBlockGray = function (x, y, w, h) {
        var sumGray = 0, pixels = w * h, data = imageData.data;
        for (var row = 0; row < w; row++) {
            for (var col = 0; col < h; col++) {
                var cx = x + col, cy = y + row, // //current position x,current positon y
                    index = (cy * imageData.width + cx) * 4, //current index in rgba data array
                    R = data[index], G = data[index + 1], B = data[index + 2],
                    gray = ~~(R * 0.3 + G * 0.6 + B * 0.1); //类似于PS中的RGB通道根据权重计算灰度
                sumGray += gray;
            }
        }
        return ~~(sumGray / pixels);
    };
    // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var avg = getBlockGray( ~~(c * char_h), ~~(r * char_h) , ~~char_w, ~~char_h);   //获取灰度均值
            frame += charMap[avg];
        }
        frame += '<br/>';
    };
    return frame;
}
// 捕获视频当前帧画面并转化为字符画
var captureImage = function () {
    canvas.width = $video.prop("videoWidth"); canvas.height = $video.prop("videoHeight");
    if (canvas.width) {
        var ctx = canvas.getContext('2d');  //获取画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);   //清除画布
        ctx.drawImage($video[0], 0, 0, canvas.width, canvas.height);   //将视频当前画面绘制至画布
        v_app.content = toChars(ctx, canvas.width, canvas.height, document.body.clientWidth/12*2);  //将画布图像转换为字符画
    }
}
// 开始位置
var $fileInput = $("#file"), $video = $("#video");
var canvas = document.createElement("canvas");
// 文件更改时修改视频源
$fileInput.on("change",function(){
    window.timer ? clearInterval(window.timer) : null;
    $video.attr("src",URL.createObjectURL(this.files[0]));
});

$video.on("play",function(){
    // 定时捕获画面并绘制字符画
    window.timer = setInterval(function () {
        captureImage(1);
    }, 20);
});
$video.on("pause ended",function(){
    clearInterval(window.timer);
});