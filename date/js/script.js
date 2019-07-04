window.onload = function(){
    var $v_app = window.$v_app = new Vue({
        el: "#view",
        data: {
            rotate: 0,
            timer: null,
            format: "YYYY-MM-DD HH:mm:ss",
            ct: moment(),
            unitMap:'十百千十百万亿兆京垓秭穰沟涧正载',
            numberMap: '零一二三四五六七八九',
            tgMap: '癸甲乙丙丁戊己庚辛壬',
            dzMap: '亥子丑寅卯辰巳午未申酉戌'
        },
        mounted:function(){
            _this = this;
            this.$nextTick(function(){
                this.timer = setInterval(function(){
                    _this.ct = moment();
                },1000);
                // 启动动画
                var start_timer=setInterval(function(){
                    _this.rotate = _this.rotate + 3.6;
                    _this.rotate>=360 && clearInterval(start_timer);
                },10);
            });
        },
        methods: {
            // 生成一个递增循环填充数组 起始值 数组长度 偏移量
            createList(start, count, offset){
                return new Array(count||60).fill(offset||0).map(function(v,i,c){
                    return (start+i)%count+v;
                });
            },
            // 获取旋转角度 i:当前节点索引 count: 总节点数
            getRotateStyle(i, count){
                return { transform: `rotate(${this.rotate/count*i}deg)` }
            },
            // 数值转换大写 v:数值 enable:启用计数单位
            toUpper(v, enable){
                _this = this;
                var str = String(v).split('').reverse().map(function(v,i){
                    var unit = enable ? _this.unitMap[i-1]||"" : "";
                    return _this.numberMap[v] + unit;
                }).reverse().join('').replace(/零+/mg,"零");
                return str.length>1 ? str.replace(/零$/mg,"").replace(/^一/mg,""): str ;
            },
            // 干支纪年转大写 v:干支年
            toUpperGz(v){
                return [ this.tgMap[~~(v/10)], this.dzMap[v%10] ].join('');
            },
            // 公元纪年转干支纪年 m:moment对象
            toGzYear(m){
                var gzYear = m.year()-3;
                return (gzYear%10)*10 + gzYear%12;
            }
        },
        computed: {
            // 动态获取基值
            base: function(){
                return {
                    year: [2019],
                    month: 12,
                    date: this.ct.daysInMonth(),    // 天数
                    hour: 24,
                    minute: 60,
                    second: 60,
                    gz: 60,
                    gzYear: this.toGzYear(this.ct),
                }
            },
            // 各时间单位动态旋转样式
            style: function(){
                var ct = this.ct;
                var base = this.base;
                return {
                    gzYear: {transform: `rotate(${-6*this.toGzYear(ct)}deg)`},
                    year: { transform: `rotate(${0}deg)`},
                    month: { transform: `rotate(${-30*ct.month()}deg)`},
                    date: { transform: `rotate(${-360/ct.daysInMonth()*(ct.date()-1)}deg)`},
                    hour: { transform: `rotate(${-15*ct.hour()}deg)`},
                    minute: { transform: `rotate(${-6*ct.minute()}deg)`},
                    second: { transform: `rotate(${-6*ct.second()}deg)`}
                }
            }
        }
    })
}