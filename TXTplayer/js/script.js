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
        // 初始化结束后
        this.$nextTick(function () { });
    },
    methods: {}
});
// 配置灰度字符映射表
var charMap = getCharsMap();
function getCharsMap() {
    var map = {}, chars = ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'];
    var step = parseInt(256/(chars.length-1));  //映射步长=最大字符长度/映射字符长度
    for (var i = 0; i < 256; i++) {
        map[i] = chars[parseInt(i / step)];
    };
    return map;
}
// 图像转字符画
function toChars(ctx, vw, vh, rowChars) {
    var sw = $(window).width(), sh = $(window).height(); // 获取屏幕宽高
    var frame = "", image = ctx.getImageData(0, 0, vw, vh); //字符画帧数据,当前画布图像数据
    var fontSize = 7||parseInt($("#app").css("font-size").replace("px","")), lineHeight = 8||parseInt($("#app").css("line-height").replace("px",""));// 获取容器字体大小&行高

    var videoScale = vw / vh, screenScale = sw / sh; // 判断视频、屏幕方向(宽高比) >1宽屏 =1方屏 <1窄屏
    // var zoomScale = screenScale>videoScale ? vh/sh/lineHeight : vw/sw/fontSize; // 获取视频填充缩放比=屏幕宽高比>视频宽高比?高度缩放比:宽度缩放比
    var rows, cols, char_w, char_h, maxRows = sw/fontSize, maxCols = sh/lineHeight;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度、字符画最大列数、字符画最大行数
    screenScale>videoScale ? (rows=maxCols>vh?vh:maxCols) : (cols=maxRows>vw?vw:maxRows); // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
    char_w = char_h = rows ? vh/rows : vw/cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
    rows ? cols=vw/char_w : rows=vh/char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
    // 计算一个像素区域的平均灰度值
    var getBlockGray = function (x, y, w, h) {
        var sumGray = 0, pixels = w * h, data = image.data;
        for (var r = 0; r < w; r++) {
            for (var c = 0; c < h; c++) {
                var cx = x + c, cy = y + r, // 当前像素坐标位置(原点:左上角)
                    idx = (cy * image.width + cx) * 4, //当前像素数据起始指针位置(每像素由rgba数据组成)
                    R = data[idx]||128, G = data[idx + 1]||128, B = data[idx + 2]||128,
                    gray = (R*30 + G*59 + B*11 + 50) / 100; //类似于PS中的RGB通道根据权重计算灰度
                sumGray += gray;
            }
        }
        return sumGray / pixels;
    };
    // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var avgGray = getBlockGray( parseInt(c * char_h), parseInt(r * char_h) , parseInt(char_w), parseInt(char_h));   //获取灰度均值
            frame += charMap[ parseInt(avgGray) ];
        }
        frame += '<br/>\n';
    };
    return frame;
}
// 捕获视频当前帧画面并转化为字符画
var captureImage = function () {
    canvas.width = $video.prop("videoWidth"); canvas.height = $video.prop("videoHeight");
    if (canvas.width) {
        var ctx = canvas.getContext('2d');  //获取画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);   //清除画布
        ctx.drawImage($video[0], 0, 0, canvas.width, canvas.height);   //将视频当前帧画面绘制至画布
        v_app.content = toChars(ctx, canvas.width, canvas.height, document.body.clientWidth/12*2);  //将画布图像转换为字符画
        // v_app.$nextTick(function () {
        //     console.clear();
        //     console.error("%c%s","font-family: Courier New; font-size: 12px;line-height:8px;",$("#app").text()); //输出到console
        // });
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
    window.timer = setInterval(function () {
        captureImage(1); // 定时捕获画面并绘制字符画
    }, 20);// 1000/20=50fps
});
$video.on("pause ended",function(){
    clearInterval(window.timer); // 视频暂停或结束停止定时器
});