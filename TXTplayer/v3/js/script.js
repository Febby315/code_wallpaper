const getImageBlob = function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function () {
        if (this.status == 200) {
            cb(URL.createObjectURL(this.response));
        }
    };
    xhr.send();
}

$(function(){
    const u = navigator.userAgent;
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; //android终端
    const space = isAndroid? '&nbsp;' : '&ensp;';
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app = window.v_app = new Vue({
        el: "#app",
        data: {
            src: "",
            flvsrc: "//aliyun-flv.yy.com/live/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-96597708953498332-96597708953498333-2-2748477-33.flv?codec=orig&secret=bec0e1c80fad166895855545ff4efc89&t=1562310185&appid=15013",
            m3u8src: "//ivi.bupt.edu.cn/hls/hunanhd.m3u8",
            content: null, // 视图html内容
            timer: null, // 定时器索引
            range: document.createRange(), // 用于通过TagString创建虚拟dom(DocumentFragment)节点
            stats: new Stats(), // 性能监视器:含fps、耗时ms、内存分配
            showStats: !true, // 显示统计信息
            enableColor: !true, // 启用输出色彩
            // 拉伸/自适应
            fps: 30, // fps(流畅度)
            fontSize: parseInt($("#view").css("font-size"))||12, // 视图容器字体大小
            chars: [space, '.', ':', ';', '!', 'i', 'c', 'e', 'm', '@'], // 映射字符集;
            sw: $(window).width(), sh: $(window).height(), // 存储屏幕宽高(含初始化)
            sourceScale: 1, // 默认素材宽高比
            currRowTempFn: null, // 行模板
            currFrameTempFn: null, // 帧模板
            scale: 1, // 画面缩放 TODO
        },
        // 动态计算
        computed:{
            // 配置灰度字符映射表
            charMap:function () {
                let _this = this;
                let len = 256, step = ~~(len/(this.chars.length-1)); // 映射步长=最大字符长度/映射字符长度
                return Array.apply(null, Array(len)).map(function(v,i,c){
                    return _this.chars[~~(i / step)];
                });
            },
            // 屏幕宽高比
            screenScale:function(){
                return this.sw / this.sh;
            },
            // 屏幕允许最大行数
            maxRow: function(){
                return ~~(this.sh / this.fontSize);
            },
            // 屏幕允许最大列数
            maxCol: function(){
                let fontWidth = this.fontSize / 2;
                return ~~(this.sw / fontWidth);
            },
            // 画面帧间隔时间ms
            fpsStep: function(){
                return 1000 / this.fps;
            },
            viewStyle: function(){
                return {
                    transform: 'scale('+this.scale+')'
                }
            }
        },
        mounted: function () {
            this.$nextTick(function(){
                this.initStats(); // 初始化统计工具
                this.src = purl().param("src") || "video/v.mp4";
                this.scale = parseFloat(purl().param("scale")||1);
                this.enableColor = !!~~purl().param("enableColor");
            });
            window.onresize = this.resetToCharsConfig; // 窗口大小改变
        },
        // 数据监听
        watch: {
            src: function(nv, ov){
                let video = this.$refs.video, canvas = this.$refs.canvas;
                let ctx = canvas.getContext('2d');
                this.timer ? clearInterval(this.timer) : null; // 移除定时器
                ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布
                var ext = purl(nv).attr("file").split(".").pop();
                switch(String(ext).toLowerCase()){
                    case "flv": this.loadFlv(nv, ext); break;
                    case "m3u8": this.loadHls(nv, ext); break;
                    case "jpg": this.loadImage(nv, ext); break;
                    case "png": this.loadImage(nv, ext); break;
                    case "gif": this.loadImage(nv, ext); break;
                    default: video.src = nv; break;
                }
                this.$nextTick(function(){
                    video.load();
                });
            },
            enableColor: function(nv, ov){
                this.resetToCharsConfig();
            }
        },
        methods: {
            // 加载Flv链接地址
            loadFlv: function(src, callback){
                let video = this.$refs.video;
                if (flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                    video.load();
                    // flvPlayer.play();
                    callback instanceof Function ? callback(flvPlayer) : null;
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls: function(src, callback){
                let video = this.$refs.video;
                if(Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(src);
                    hls.attachMedia(video);
                    video.load();
                    callback instanceof Function ? callback(hls) : null;
                }
            },
            // 加载静态图片链接地址
            loadImage: function(src, callback){
                let image = this.$refs.image;
                getImageBlob(src, function (url) {
                    image.src = url;
                });
            },
            // 实时生成行模板
            rowTempFn: function(){
                let canvas = this.$refs.canvas , enableColor = this.enableColor ,templates = [];
                for(let i=0;i<canvas.width;i++){
                    if(!enableColor){
                        templates.push('{{=it['+i+'].T}}');
                    }else{
                        templates.push('<span style="color:rgb({{=it['+i+'].R}},{{=it['+i+'].G}},{{=it['+i+'].B}});">{{=it['+i+'].T}}</span>');
                    }
                }
                return doT.template(templates.join(''));
            },
            // 实时生成帧模板
            frameTempFn: function(){
                let canvas = this.$refs.canvas, enableColor = this.enableColor, templates = [];
                for(let i=0;i<canvas.height;i++){
                    for(let j=0;j<canvas.width;j++){
                        if(!enableColor){
                            templates.push('{{=it['+i+']['+j+'].T}}');
                        }else{
                            templates.push('<span style="color:rgb({{=it['+i+']['+j+'].R}},{{=it['+i+']['+j+'].G}},{{=it['+i+']['+j+'].B}});">{{=it['+i+']['+j+'].T}}</span>');
                        }
                    }
                    templates.push('<br/>\n');
                }
                return doT.template(templates.join(''));
            },
            // 重置采集参数
            resetToCharsConfig: function(){
                let canvas = this.$refs.canvas;
                // 采集屏幕宽高
                this.sw = $(window).width();
                this.sh = $(window).height();
                // console.log("最大允许 宽:%s 高:%s ", this.maxCol, this.maxRow);
                // console.log("素材比屏幕宽?(%s) 素材宽高比:%s 屏幕宽高比:%s", this.sourceScale>this.screenScale, this.sourceScale, this.screenScale);
                // 拉伸模式
                // canvas.width = this.maxCol;
                // canvas.height = this.maxRow;

                // 自适应模式
                if(this.sourceScale > this.screenScale){
                    canvas.width = this.maxCol;// 宽度自适应
                    // 在宽度自适应情况下高度/2与宽度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    canvas.height = this.maxCol / this.sourceScale / 2;
                }else{
                    canvas.height = this.maxRow;// 高度自适应
                    // 在高度自适应情况下宽度*2与高度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    canvas.width = this.maxRow * this.sourceScale * 2;
                }

                // console.log("最终canvas宽高", canvas.width, canvas.height);
                this.currRowTempFn = this.rowTempFn(); // 生成行模版
                this.currFrameTempFn = this.frameTempFn(); // 生成帧模版
            },
            // 绘制canvas
            drawCanvas: function(ctx, ele){
                const canvas = this.$refs.canvas;
                ctx.drawImage(ele, 0, 0, canvas.width, canvas.height); // 绘制图像
                this.toFrameData(ctx, canvas.width, canvas.height, this.update); // 将画布图像数据转换为字符画
            },
            // 更新画面
            update: function(frameData){
                let _this = this, view = this.$refs.view;
                // 方法一
                let frame = frameData.map(function(e){
                    return _this.currRowTempFn(e);
                }).join("<br/>\n");
                // 方法二
                // let frame = this.currFrameTempFn(frameData); //RangeError: Maximum call stack size exceeded(超出堆栈上限)
                // 方法三
                // var fragment = this.range.createContextualFragment(frame);
                // view.innerHtml = null;
                // view.appendChild(fragment);
                this.content = frame; // 渲染画面
                this.$nextTick(function(){
                    this.showStats && this.stats.update();// 触发性能统计
                });
            },
            // 图像转字符画数据
            toFrameData: function(ctx, cw, ch, callback) {
                let image = ctx.getImageData(0, 0, cw, ch);
                let imgDate = image.data ; // 当前画布图像数据
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                let rowArray = [];
                for (let i=0, idx=0; i<image.height; i++) {
                    let colArray = [];
                    for (let j=0; j<image.width; j++, idx+=4) {
                        let p = { R: 0, G: 0, B: 0 };
                        p.R = ~~imgDate[idx], p.G = ~~imgDate[idx+1], p.B = ~~imgDate[idx+2];
                        // 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                        // let Gray = ~~( (p.R*30 + p.G*59 + p.B*11 + 50)/100 );
                        // https://www.cnblogs.com/zhangjiansheng/p/6925722.html
                        let Gray = (p.R*38 + p.G*75 + p.B*15) >> 7;
                        p.T = this.charMap[Gray]; // 映射灰度字符
                        colArray.push(p); // 行数据
                    }
                    rowArray.push(colArray); // 帧数据
                };
                if (callback instanceof Function) callback(rowArray);
            },
            // 初始化统计工具
            initStats: function(){
                if(this.showStats){
                    this.stats.domElement.className = "stats";
                    let tool = document.getElementById("tool");
                    tool && tool.appendChild(this.stats.domElement);
                }
            },

            // vue事件
            // fileChange 文件更改时修改视频源
            fileChange: function(e){
                let file = this.$refs.file, image = this.$refs.image;
                if(file.files[0]){
                    this.src = URL.createObjectURL(file.files[0]);
                    // 兼容图片
                    let type = file.files[0].type;
                    if(type.split("/")[0]==="image"){
                        image.src = this.src;
                        image.setAttribute("data-type", type);
                    }
                }
            },
            // imgLoaded 图片加载成功
            imgLoaded: function(e){
                let image = this.$refs.image;
                this.sourceScale = image.width/image.height;
                this.resetToCharsConfig();
                // 开始渲染
                let _this = this, canvas = this.$refs.canvas;
                let ctx = canvas.getContext('2d');
                this.drawCanvas(ctx, image);
                // gif支持
                if(["image/gif"].includes(image.getAttribute("data-type"))){
                    var rub = new SuperGif({ gif: image, progressbar_height: 0 });
                    rub.load(function(){
                        let gifCanvas = rub.get_canvas();
                        _this.timer = setInterval(function(){
                            _this.drawCanvas(ctx, gifCanvas);
                        }, _this.fpsStep);
                    });
                }
            },
            // canplay 媒体可播放
            // loadedmetadata 媒体元数据加载
            loadedmetadata: function(e){
                let video = this.$refs.video;
                this.sourceScale = video.videoWidth/video.videoHeight || this.screenScale;
                this.resetToCharsConfig();
            },
            // play 视频播放事件
            play: function(e){
                let _this = this, video = this.$refs.video, canvas = this.$refs.canvas;
                let ctx = canvas.getContext('2d');
                this.timer = setInterval(function (){
                    if(!video.paused){
                        _this.drawCanvas(ctx, video);
                    }
                }, _this.fpsStep);
            },
            // pause 视频暂停/停止事件
            pause: function(e){
                clearInterval(this.timer); // 视频暂停或结束停止定时器
                e.type=="ended" ? this.content=null : null; // 结束播放清除视图
                $("#tool").show(); // 显示工具栏
            },
            // videoPlay 播放按钮点击事件
            videoPlay: function(e){
                let video = this.$refs.video;
                video.paused?video.play():video.pause();
            },
        }
    });
});