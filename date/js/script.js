window.onload = function(){
    var $v_app = window.$v_app = new Vue({
        el: "#view",
        data: {
            timer: null,
            format: "YYYY-MM-DD HH:mm:ss",
            ct: moment(),
            unitMap:'十百千十百万亿兆京垓秭穰沟涧正载',
            numberMap: '零一二三四五六七八九',
            tgMap: '癸甲乙丙丁戊己庚辛壬',
            dzMap: '亥子丑寅卯辰巳午未申酉戌',
        },
        mounted:function(){
            _this = this;
            this.$nextTick(function(){
                this.timer = setInterval(function(){
                    _this.ct = moment();
                },1000);
            });
        },
        methods: {
            getRotateStyle(i, count){
                return { transform: `rotate(${360/count*i}deg)` }
            },
            toUpper(v, enable){
                _this = this;
                var str = String(v).split('').reverse().map(function(v,i){
                    var unit = enable ? _this.unitMap[i-1]||"" : "";
                    return _this.numberMap[v] + unit;
                }).reverse().join('').replace(/零+/mg,"零");
                return str.length>1 ? str.replace(/零$/mg,"").replace(/^一/mg,""): str ;
            },
            toGz(v){
                return [ this.tgMap[~~(v/10)], this.dzMap[v%10] ].join('');
            },
            getGzYear(m){
                var gzYear = m.year()-3;
                return (gzYear%10)*10 + gzYear%12;
            }
        },
        computed: {
            style: function(){
                var ct = this.ct;
                return {
                    gzYear: {transform: `rotate(${-6*this.getGzYear(ct)}deg)`},
                    year: { transform: `rotate(${0}deg)`},
                    month: { transform: `rotate(${-30*ct.month()}deg)`},
                    date: { transform: `rotate(${-360/ct.daysInMonth()*(ct.date()-1)}deg)`},
                    hour: { transform: `rotate(${-15*ct.hour()}deg)`},
                    minute: { transform: `rotate(${-6*ct.minute()}deg)`},
                    second: { transform: `rotate(${-6*ct.second()}deg)`}
                }
            },
            staic: function(){
                return {
                    gzYear: this.getGzYear(this.ct),
                    year: 1,
                    month: 12,
                    date: this.ct.daysInMonth(),    // 天数
                    hour: 24,
                    minute: 60,
                    second: 60
                }
            }
        }
    })
}