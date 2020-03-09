$(document).ready(function () {
    var v_body = new Vue({
        el: "#body",
        data: {
            list: {},
            srcList: {
                mp4: "https://www.w3school.com.cn/i/movie.mp4",
                webp: "https://www.w3school.com.cn/i/movie.webm",
                ogg: "http://www.runoob.com/try/demo_source/mov_bbb.ogg",
                ogv: "https://www.quirksmode.org/html5/videos/big_buck_bunny.ogv",
                
                m3u8: "http://ivi.bupt.edu.cn/hls/hunanhd.m3u8",
                flv: "http://proxy.hls.yy.com/livesystem/15013_xv_54880976_54880976_0_0_0-15013_xa_54880976_54880976_0_10_0.flv?org=yyweb&uuid=a33061b395004615918247ca0269e571&t=1571909103&tk=5e308dfa33fd4b863134d34646da1d33",
                rtmp: "rtmp://58.200.131.2:1935/livetv/hunantv",
            },
            type:"application/x-mpegURL",
            src: 'https://www.w3school.com.cn/i/movie.webm' || "http://192.168.2.94:7002/desktop/564822672.m3u8",
        },
        mounted:function(){
            this.$nextTick(function(){
                // $(".playerbox", document.body).draggable().resizable();   //可任意拖放
            });
        },
        methods: {
            //flv
            flvPlayer: function(item, ele){
                if (flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({ type: 'flv', src: item.src });
                    flvPlayer.attachMediaElement(ele);
                    flvPlayer.load();
                    flvPlayer.play();
                }
            },
            //m3u8
            hlsPlayer: function(item, ele){
                if(Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(item.src);
                    hls.attachMedia(ele);
                    hls.on(Hls.Events.MANIFEST_PARSED,function() {
                        ele.play();
                    });
                }else if (ele.canPlayType('application/vnd.apple.mpegurl')) {
                    ele.src = item.src;
                    ele.addEventListener('canplay',function() {
                        ele.play();
                    });
                }
            },
            //rtmp
            rtmpPlayer: function(item, ele){
                $(ele).remove();
                $("#dv_"+item.id).show();
                var player = new TcPlayer("dv_"+item.id, {
                    rtmp : item.src,
                    autoplay : true, controls:"none", live:true,
                    width:"100%", height:"100%"
                });
            },
            //h5
            h5Player: function(item, ele){
                ele.src = item.src;
                ele.play();
            },
            // 播放
            play: function () {
                _this = this;
                var key = "v_"+new Date().getTime();
                var item = { id: key, src: _this.src, butShow: false, player: _this.h5Player };
                var protocol = $.url(_this.src).attr("protocol");
                if(protocol=="rtmp"){
                    $.extend(item, { player: _this.rtmpPlayer });
                }else if(protocol == "http" || protocol == "https"){
                    var ext = $.url(_this.src).attr("file").split(".").pop().toLowerCase();
                    var palyerMap = { m3u8: _this.hlsPlayer, flv: _this.flvPlayer };
                    var typeMap = {
                        webm: 'video/webm',
                        ogg: 'video/ogg',
                        ogv: 'video/ogg',
                        m3u8: 'application/x-mpegURL'
                    };
                    $.extend(item, { player: palyerMap[ext] || item.player, type: typeMap[ext] || item.type });
                }
                _this.list[item.id] = item;
                _this.$nextTick(function(){
                    var view = _this.$refs.view[Object.keys(_this.list).length];
                    var ele = _this.$refs.video[Object.keys(_this.list).length];
                    console.log('ele', _this.$refs , view, ele);
                    $(view).draggable().resizable();
                    item.player(item, ele);
                });
            },
            // 关闭
            del: function(item){
                console.log(item.id);
                this.list[item.id] = undefined;
            },
            // 置顶
            setTop: function(item){
                this.list=this.list.concat(this.list.splice(this.list.indexOf(item), 1));
            },
            handleSelectChange: function(e){
                this.src = $(e.target).val();
            }
        }
    });
});