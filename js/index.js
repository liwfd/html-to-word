let btn = document.getElementById('btn');
let ip_ipt = document.getElementById('ip');
let operate_ipt = document.getElementById('operate');
let isp_ipt = document.getElementById('isp');

btn.addEventListener('click', _ => {
    fetch('/api/generate', {
        body: JSON.stringify({
            ip: ip_ipt.value,
            operate: operate_ipt.value,
            isp: isp_ipt.value,
            start: new Date(new Date().getTime() - 3 * 24 * 3600 * 1000).format('yyyy-MM-dd hh:mm')
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        method: 'POST',
    }).then(res => {
        console.log(res.json());
    })
});
