// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/xp/apps/mocks.js. Replace module by module; do not edit in place.
/* "Screenshots" for the project documents: original SVG mock frames drawn here (no real screenshots).
   XPApps.mocks[kind](lang) -> SVG string, viewBox 0 0 480 300. */
(function () {
  'use strict';
  if (!window.XPApps) return;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function L(lang, ru, en) { return esc(lang === 'ru' ? ru : en); }
  var F = 'font-family="Tahoma,Verdana,sans-serif"';
  function wrap(body, bg) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="xpa-mock-svg" role="img">' +
      '<rect width="480" height="300" fill="' + (bg || '#eef1f6') + '"/>' + body + '</svg>';
  }

  // deterministic pseudo-QR: 21x21 modules with three finder squares
  function qr(x, y, size, seed, fg, bg) {
    fg = fg || '#111'; bg = bg || '#fff';
    var n = 21, m = size / n, s = seed || 7, out = '<rect x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" fill="' + bg + '"/>';
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    function finder(fx, fy) {
      return '<rect x="' + (x + fx * m) + '" y="' + (y + fy * m) + '" width="' + 7 * m + '" height="' + 7 * m + '" fill="' + fg + '"/>' +
        '<rect x="' + (x + (fx + 1) * m) + '" y="' + (y + (fy + 1) * m) + '" width="' + 5 * m + '" height="' + 5 * m + '" fill="' + bg + '"/>' +
        '<rect x="' + (x + (fx + 2) * m) + '" y="' + (y + (fy + 2) * m) + '" width="' + 3 * m + '" height="' + 3 * m + '" fill="' + fg + '"/>';
    }
    var d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var inF = (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8);
      if (inF) continue;
      if (rnd() < 0.48) d += 'M' + (x + c * m).toFixed(2) + ' ' + (y + r * m).toFixed(2) + 'h' + m.toFixed(2) + 'v' + m.toFixed(2) + 'h-' + m.toFixed(2) + 'z';
    }
    return out + '<path d="' + d + '" fill="' + fg + '"/>' + finder(0, 0) + finder(14, 0) + finder(0, 14);
  }

  function phone(x, y, w, h, inner, dark) {
    return '<g><rect x="' + (x - 6) + '" y="' + (y - 14) + '" width="' + (w + 12) + '" height="' + (h + 28) + '" rx="16" fill="' + (dark ? '#1b1f27' : '#2a2f38') + '"/>' +
      '<rect x="' + (x + w / 2 - 16) + '" y="' + (y - 8) + '" width="32" height="3" rx="1.5" fill="#555c68"/>' +
      '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" overflow="hidden">' + inner + '</svg></g>';
  }

  var mocks = {};
  // wax: real screenshots of the live site, 480x300 JPEG
  mocks['wax-landing'] = function () { return wrap('<image href="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAEsAeADASIAAhEBAxEB/8QAHAABAQACAwEBAAAAAAAAAAAAAAECAwUGBwQI/8QAUBAAAgEDAwEDBQwFCAgFBQAAAAECAwQRBQYSITFBUQcTImFxFBYXMlJVVoGRlNHSFSOSlbE2QlNidJOh4hgzNDWzwcLhY3JzgtMIV4Sisv/EABoBAQACAwEAAAAAAAAAAAAAAAABAwIEBgX/xAAsEQEAAgECBQEGBwAAAAAAAAAAAQIDBBEFEhMhMdEGIjJRYYEjJEFxscHh/9oADAMBAAIRAxEAPwDw0+unpl/UhGdOyuZQksxlGjJpr7BpMI1NUs4VIqUJV4KUWsppyXQ9Ru5atU1vWaFpvK50iztNTq2tG1hcuMKNKMoqPGPNYiuWOiwsdcIDyu4sbu2gp3FrXpQbwpVKcorP1oypadfVqcalKzuJwl1Uo0pNP68HoFrcane2+vWWu6vcatGjoMryNK5quorevyhjCbaU4qTWe3qz3O81SO3vcGm2GlxVs7WdSPm8whDjx9BJJ9XyePYB+S69heW9N1K9rXpwXTlOlKK+1o+Y/Vut3i3HsDX6mp6PO1dC2qONC6Sk+Soqamu7o5dH6u59F+UgAAAAAAAAAAAAAAAAAAAAAAAAAAAAHZvJ7tynuXcHua6857ktqE7q4VJ4nKEF8VPubbSz6wOtYZD9CXmk7FirGyjtONX9I6ZC6tKdCUncVZyeFBPPTCeXJvC65PLvKfst7N1ehTpSm7S8pedoxnJSlTfZKDa6PDx170wOmFwztfkv27b7n3lZaffJu0SlVrxTacoxWcZXi8I9muNC2vSvbq10PYEdWp2MvN3VeE4RjGeE3CPOWZySayl44zkD82g9l8q22tvvYunbk2/ZW9sqtwsOhBwUqU1LCkm/jJpJ+vJ40AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGyhVnQrU61J4nTkpReOxp5R2upurQ7ypK51XaVveX9Zudzcu+rU3WqPrKXGLwsvLwuiOoADtF3uiwp2VzQ0DQKOk1bqk6FxWhdVKznReG4Ym2llqLyuvQ7ppvl31i1saNC60y2u61OOJ15VHBzfjhLC+o8jAHqW5PLXq2taNc6bR0+3s/dMHTnVhNzfBrElhrHVPGTy0AAAAAAAAAAAAAAAAAAAAAAAAAAAAB33yMbhsdvbw56pUhStLy3lbTqz+LBtppv1Zjj6zoQA/T1ns2tG6pXUNdo0rbT7V0NIvKE81KcHPklUT9CcVH0Mfzl16PqeWeXDcVDWtW0y0pXNtc1rC2cbmtaNuk6smuSi33LC+3HcebcpceOXjwz0MQO3eSvcFttvetjfX0+FpJSo1p/IjJY5exPDfqPe7ejcSur652hujR42Go1ncVVVpqvKjUaSlKm1NLrhPEl0eT8rAD2zyxajo2kbJ0vaOk30LqtSqxnVcainJRipZc8dE5SlnHtPEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAd+2H5ObjcNOOoanOdrpzfocV6db2Z7F6/sNfU6rFpcfUyztCYrNp2h0OnTnUmoU4ylJ9kYrLZzdns3cl7T52+i3sovscqTjn7cHvmn6boW2LZQsbWhbpLrPGZy9sn1ZruN2aXTePdEM+052/tDmyT+XxdvnPpHqujFEeZeE3GytzW0HKrol9xXa40nL+GThK1GrQqOnXpzp1F2xnFpr6mfpK33ZpdRpe6IZ9p9F5R0TcVs6N7b293Br+fFNr2PtX1Mxp7Q58c/j4e30/wBOlE+JfmEHou/PJrW0WnU1HRXO5sI5lUpy61KK8f60fX2rv8Tzo6PS6vDqsfUxTvH8fuptWaztIADZQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKotvCWX6jbG0uJLMaFVr1QYGkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdm8n22/fLuClb1U/clFeduGvkp/F+t9PtPcNxa1Q0Sw401GEYR4xhHokl2JHWPI7p8LDatXUpL9ZeVW8/1IdF/jyOr+UDUa+o6vCwtnylVnGnCPjJvCOR1MTxLiPSn4KdvVfHuU3Ywu9x7yv6lro1GpWUX6cs4hD2s5yPkjvKdFVde3LZWE5dkXhL7ZNH1by19eTXQLLa+25Rp6nVpKrd3XFOUE+9f1pPPXuSXieNXV1cXleVe7r1a9aTzKpVm5SftbOnw6fFiry0hTMzL1v4IrqtTctD3RY3tWKzwWP4xk/4HXat1uDZmpxtNZo1KL7YyzmFReMZdjOiUK9a3qxq29WdKpF5jOnJxa9jR6xszdNPfdm9nbwl56vWi/cF+1+sjUS6KT734Pv7HnJOXT48teW0ETMO6bW3LR1i2im1yxhpnk/lT2pT2/q0buxhxsLxuUYpdKU++Ps719ncY7Tva+i67Vs60vToVZUpr1p4Z6F5Q6UNW2JdVJJOdBRrwfg0+v+DZy1MduGcQrFPgv2n7+i6Z56PBwAdeoAAAAAAAAAAAAAAAAAAAAAAAAAABUm2klls/UexvJroO3dGoVNRsLe81F01O4r3NNVFGWMtRT6JLs8Wfl+hUdKtTqJZcJKWH6nk/a2nXlHUtPtr22kp0bilGrBrvjJZX8QPPI7w1ClpNTcOl7TtIbbpZn5yVaMLirSTw6kYJYSXbhvLwekUKsK9CnVpPMJxUo9MdGso6Tr2mUtb3ba7cu7tUdGo2Su3plvSlH3S1PH6ySXFQXT0U8tneYpRSUUkl0SQH4dAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHpO1d9ULbbdLSa+KVWhFxhJvEZptvt7n1Pi0S90+O77XV9TnGFnaVPOTzVTcpd2F39euDoYNPDocWHLbJTzPeWU2mY2c7vfXPfJurUdVipKlXq/qoy7VTS4xX2JHBAG4xDn9jQl76dPuufm6NlVjdV6r7KdOm1KTf2YXi2l3nH6VpdXUJVJucKFpRSde5q54Ul3etyfdFdWfRfX9KVF6do9OdKzbTqSn/rLiS7JTx2Lwiui9b6gfdSvnq267vUI0/Nq5uJ1VD5KlLKR6luGpCnsDUXNpZtnFZ8XhI6HsrQqk60as4PGTlfKjqsbXTKGi0pZqVWqlVLuguxfW/wCBzet21Wtx46fpO8/ZdX3azLy8AHSKQAAAAAAAAAAAAAAAAAAAAAAAAAADte1fKHuTa1FW+mX3K0TyravBVIL2Z6r6mjqgA9et/L5rcYpXGkadUl4wc4f82bZeX7Vceholkn66s2eOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG+0oxrVP1tTzdKPWc8ZwvUu9+CNBtxxorP87qRMj7rm7q6i6Vna03StKT/VUE84b7ZSffJ97+pYSSPR9k+T6FajC5vM5azg6dsq2pTvoTq4wn3npe6fKDabZ09WWmxhX1OUFhPrCin2OXi/Bfb6/A4rqNTe8afTR3lbSK+Zbd2alpeyrBRXCpeTj+pt0+svW/CPr7+48P1K+uNSvat5eVHOtVlmT/AOS9Q1C+utSvKt5f1517irLlOpN5bZ8xvcO4fGkpvad7z5n+o+jG9+YAB6TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADn4aBeXsYq3p5UYrr9RwB33ae+rLS7VUdTsatWcVhVKLT5L1p4NPWXz0pzYa7z8mVdp8uJsrK+0mslXg0s9p126rzubipXqycp1JOTbO7bq3rYalScdNsqsJvpzrYXH2JNnRCNH1LROTLXlmS23iAAG6xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQBAUAAXAwBBguBgCYGC4GAJgYLgYAmAXAwBAZYGAMRgywMAY4GDLAwBjgYMsDAGOBgzwMAYYGDPA4gYYGDPiOIGGDse2aOgUa0Km4qdatTks+bpz44+w6/xO5bW0m01ij6dWCnFelDPVP2FGozxgpz28JiN3y7tttszn5zbXnqMePLzVSpzyva+uTqmDtu59Kt9JT4zTlJNRj3nVeJODNGanPXwTGzDAwZ4HEuQwwMGfEYAwwMGeBgDDAwZ4JgDHAwZYGAMcAywMAYgywMAYjBcDAEwMFwMATAwXAwBMAuBgCAuBgDEFAEBQBcFwXAwBMDBlgYAxwMGWC4AxwMGWBgDHAwZ4GAMMFwZ4HEDDAwbOJeIGvA4mziXiBq4l4mziXiBq4l4m3iXiBp4jibuJeAGniOJv4DgBp4Dgb+A4AaOA4H0cBwA+fgZRUoy5Qbi/FPDN3AvADRPnOXKcpSl4yeWY8D6eA4AfNwHA+jgOAHz8BwPo4E4AfPxHE+jgTgBo4k4m9wHEDRxJxN/EnEDTxHE28RxA08RxNvEnEDVgYNvEnEDXgmDbxJgDXgYNmCYAwwMGeCYAwwMGeBgDDAwZYGAMcEwZ4JgDLBcGWBgDHBcGWBgDHBcGWC4AwwXBlguAMMFwZ4LgDDBeJnguANfEvE2cS8QNfEvE2cSqIGviXibFEyUQNXEvE2qJVEDVwLwNyiVRA0qBVA3qB9mnaVealV81Y286su9pdF7X2IDjeBeB2C80zSdF6a5qqlcLttLGKqTXqcn0RxdbclhQeNM0O36dlW9nKvJ/V0ivsYHyRp8niPV+C6s+2joup11mjp15NeMaEsfbg+Oru3W5xcaV87aHybWEaKX7KRxtxqF7df7TeXFZ/+JVlL+LA7L73NWXx7GdP/ANScIfxaJ+gL5PDVrF+Er2iv+s6kQDt36Avm8RVrJ+Eb2g/+sy97erv4ljOp/wCnOE/4NnTwB2mvomqW6zX028gvGVvPH24PhlT4vjLo/B9GcdbajfWv+y3lxRf/AIdWUf4M5Olu/XYRUat87mHybunGsn+2mBj5snA+2jubT67xqmhW7z21bGcqEl68dYv7EcpZ6bo+tNR0PVlC4fZaX8VTm/UpLowOu8COBympaTe6ZV81fW1SjLucl0l7H2M+NwA+ZwI4H0OBHED53Ax4n0OJHED5+JOJvcSOIGjiTib3ExcQNXEnE28ScQNXEnE24JgDXgmDZgmANeBg2YJgDXgmDZgmAMMEwbMEwBhgYM8EwBlguC4LgCYGDLBcAY4LguC4AxwXBlguAMcFwZYLgDHBcGWCpATBUjJIqQGKRUjJIySAxUSqJkkZJAYqJkomSRUgMVEyUTJIySA5jauhrWb9wqNqhSw6nHtlnsR2fed49H0etYaQlbxhBqU6XR570n3e3tOr7I3BR0fX69veyUKFxw41H2Rkl0z6mdr3na+co1KkfSpVU3GS7HkDxdtttttt9W2Qs4uMnF9qeCAAAAAAAAAAAAKm08p9SAD1/YOoz1nR6ena1i6pzTjCdVZa8E33r19qOB3ZoS0W/UaTboVcunyfWOO1M5/ye2EoWlCrOLjSpRUpzawl39pwG+dw0dZ3BQtrGSqUbdz5VI9kpNdcepAcE4mLib3F+DMXF+DA0uJi4m5xfgzFxfgwNLiRxNrj6jFoDU0Ro2tGLQGtoxaNrRi0BrwTBsaI0BrwTBswTAGvBMGzBMAa8EwbMEwBhgmDPBMAYYGDPBMAXBcFwUCYLgYLgCYLguC4AmC4LgoEwXBSgTBkkCoAkVIIqAJGSQRUBUipBFQFRURGSAqMkRFQHF6zQeY149mOMvV4H2aFvDUtJo+5ZOF5Yvo7a4XKOPU+1H0SjGcXGSTi+1PvOt3VPzVxUprsjJpewDsNaltnVpyqW13X0i4m8ulcxdWi36px9JL2pnz1Npaq4udjChqNNLPOxrRq/wD6r0l9aOBMoylCSlCTjJdjTw0BtubS5tJ8Lq3q0J/JqwcX/iaDlrbc2uW0eFLVLvh8idRzj9kso3e+e8m83Vpply/GrYUs/akmBwYObeu203mrt/SZf+WNWH8JkWraV/O25Z/VcV1/1gcKDmnq2lL4u27L/wB1xXf/AFlWvW0Hmlt7SI/+aNWf8agHCn6W2h5KtpS21p1a/wBO923FehCtOtUqTi25pSxiLSws4PAqu47qdKpSo2emW8akXGTo2NNSw1h+k02vtP1ptP8Akto/9hof8OIHAfBTsf5hpf39X8w+CrY/zDS/v6v5juh5tZ7X3nYUbOVvq9KdalYwoVFOo31VXlJRbXVuPTk+vcBzHwX7MUOC0b0Pk+6q2Ps5mHwVbH+Yaf8Af1fzG5aZuD3bty4uKlO5nZOq7yr57zbmpxlFR4pYlxzF56Z49xpWmbmpVdUlaSp0KdzqUblKN1yk6PBRlCLlFqDco8uxrDa7eoF+CrZHzFT+8VfzD4KtkfMVP7xV/MczoMtco07S11iFGtKNs5V7yFRLNTl6MFHHX0e2XRZ7F16Z7io6rWo2y0isqfGtm4ipqE50+L6Rk4ySfLi+zsTQHBfBVsj5ip/39X8w+CrZHzDT/v6v5jRt3Rt46ctMt7nUaM6FDzSrfreadNRfnIvMeUpOXVSysdOnTr3sDyrf3k22xpu1NQ1HSbF2VzZ0pV1OnUnLmop+g1Jvo+nZ16HiXcfp3ylfyB1/+w1P4H5j7l7AMWiNGTIwMGiNGTIwMGiYM2QDDBMGZAMMEwZYGAMMEwZ4JgDDBMGeCYAxwTBlgYAFBQAKABQUAUAClIUClIVAVFREVAUyRiUDJFRijJAVGSMSgZIqMS5AzRwesQ43jl8uKf8AyOaycbrcMxpT8G4gcSAAAAAAAAAAKj9m7U/kvo/9hof8OJ+Mkfs3an8l9H/sND/hxA5U6tuKw3HW1HOi3vm7eu7dVHUlhUFTqcpuCXa5R6Pp3LsPp1jbtbUdbtdSpahK3dvwXBQc8qMuT7ZcVnszjP8Ahjg6nk7q1bWtbz166XOmoc4xalNqUmqk/T9KfpYysdnZ4BvttA3ZRq0astdjUdKdKU6cqk3G5cZT5tvH6tNSXoxTXonPaPYajQ28rPVbuNzfONVTrJtp8pScV1WeiaX1HA2mw6tC/tbipr17WhbuPGm21xUakppRal0WJKLXXKic1unRK2uUbCjSuvc8KF5GvV9Hl5yCjJccdj6yT69OgHA2e1tw6dpVvYWOsx83CztqUo1KtR4qQ5eclCXbFNcUl2dH0PooaDunzWnxr7jxOFGEbucINuU4OTi4p9GpckpZXVQWO0+uz2fRtrmnVnqF5XjSsoW1FVajbhKMpy86nnHL08Lp0UUcVLydzqWqt6mt10kqK/VwlFTdPOZyXN5nJPEnlJ+AHM7S0vWNKoVnrurSvZyjBLMm4xcV6Uk2k1nvWcLHQ5iw1Gx1KE56de211CD4ylQqxmovweH0Z1W02HUpV7aVzrVxdQpOnz87BuU4xg4unnlhU5J+lFp569Tm9u7dtNC91St4UlVuZpylTpqC4RWIQwumIrp9bA1b8s7jUNm6zZ2VKVa4rWlSFOnHtlJrokflzs6PtXR+1dD9U7v1Ovou2NU1O1jTlXtbadWEaibi2l3pY6H5l3DrN5uDVnqV3b2NvVqRSqq1pyiqj+U8t+ljC9iA+BmLKQCMjKRgQhWQCEKQCEKQCEMiAYkMiAYgoAAFAFAQAoAFKiFQFQQQAqKiFAqKQAZFRiUDIpiUDIpiUDIuTDJcgZ5Pl1SPOzk/ktM+jJjWj5yjOHyotAdcAAAAAAAABlGE5/Fi37EZeZqf0c/2WBrPXtueXK70nRbXT7vRqd3Ut4Kmq0bjzWYrpFceL7FhdvU8l8zU/o5/sseZqf0c/wBlge2f6QU/o1H79/kH+kFP6NL79/kPE/M1P6Of7LHman9HP9lge60vLndVacZw2zDjLszf/wCQz+HC8+jNP94f5DyKjWpU6MIcn6MUviv8DL3RS+U/2X+AHrXw4Xf0Zp/vD/IPhwu/ozT/AHh/kPJfdFP5T/Zf4E90U/lP9l/gB638ON39Gaf7w/yE+HG7+jNP94f5DyTz9P5T/Zf4E8/T+U/2X+AHou6vKvf7h0WvpdPSaVjC4XCtU90edcqbTTilxWG/HuwefGEakZvEW8+xoyAHzVbunSq+bmmumcn0HI7T16y2zuelqOp2Hu60nQnSqUuMZPD70pdH/wBwOKhWp1PiTi/rMmd10HTtqeUPyhXdtaafW0rTp2EpUadGUYSdWLWZYWUujfTs6HzS8nDuN/6htbSNbWbW1VeNSvFvlL0cwfHsa5dv+AHUiHLbv2VubZ9GncarCjO1qVPNwr0ainFyw3jHRron2o4G4p6pa591WVajhZfnaEo4+0DeyM+BXtZvpGP2Gy3qXt1dUrW3oupXqzUKdOEMylJvCSXiB9bIcnqey94aZptbUb/SK9C0opOpUlw9FZx2Zz3mW1thbm3bZSvdLowlaqq6TqVa6guSSb6dvTK7gOHlOEfjSS9rNTuaXJRTbbeOiOW1PRKezd21NO3FaQ1SnbRjKrStriVNTUopr0sZWMruOL1Wpp11rtero1tUtbCdTlRo1JcpQj4N5frAzBWQCApAAQCAoAAqAAFKiIAUpCgUEKBSmJQMgQAZFMSgZAxKBlkuTEZAyyXJjkZA4K5h5u4qR8JM1H16nHjdN/KSZ8gAAADKEJVJxhCLlKTwopZbZiffoerV9E1OjqFpToTr0XmCr0lUin3PD712p9zA/THkb27PQdm2/uyxjbX9y3UrPo5TjluHL/2vs7jvfGPgvsOp+S7Xr7cmzbTU9UnCdzVqVFJwgorEZtLovUjkLTTtVoUIU/dcVUWfOVObk5ejLHaunpNMDnOMfBfYOMfBfYcRUstV51K1O9iqk6VKPF/EUk3zwsdMrsf/AGPps6F/CqpXd2qkI04rjCKWZ9eTfTs6x7PAD7uMfBfYOMfBfYfHdUr6V3GVCrGNBRw45SfLPa+jysd3Q4+rZa7Vtp0nfU1KUHHMXxak44ypKPRZ64xn1gc5xXgvsHFeC+w+DTaGo0q1R31zCrT7IRhHGOvR/Zhd5yAE4rwX2Hz39eFlY3F1KHJUaUqjiu18U3j/AAPpOP3D/uHUv7JV/wD4YHWrCvvLV7G31Owu9Co2l5SjcUKVazqynCE1yjGTU0m0mk2lg3+5d+fOO3PuNb/5DDQ7G6v/ACe7ap2dwqUoWdpUnFzlBVYKmswco9Un6vA37W0LWtKvZ1NW1n9I0ZU8QU3NSpyxHL7cSzjv7O7tYHXN13VTVdobq0zXre1raholCNbz9CDjTc5QcoShFttOKeOr7TwjPRHuW5fi+VD+x23/AAGeGLsXsAp819S85RylmUeqPoIB6fu6nY19g6NvbZVKGmXVlFUK7tEoSpxkuEovHa1J9r64lk4fya7X3pb0qO9NvOyuZVfORdvcVXzrx5Yknnp1cflZ6HVtN1++0TR9Z0u2pQr2OqUeFSlPP6qS7Jxx3/8AbwPXPIpvTQaG0bTRb7UaFpe0Ks4KnXmoecUpOScW+nfj2oDp2+N27h8oleO2bPbtShXtannqtupOVVThFqWc4SScn/gdguPLHLT9vT0vXNv3kdbhR8zOlcRUaU3jHKXLr17WsfWfdp15bz/+oS8dpVpVIVrDzc5U5JrkoRbTa7/RPUdW0jTtZtZWuqWdC6oyWHGrBSx7H2p+tAeFeRPcm19t6PqlfXLyjQu6teKjGVKU5uCj0xhPvbNXlC3bomubq0HXNAtrq4hptRVbyrTt3ByhGcZJZa7sS6vxOc8jmiaFDd27LJ2NK4lYXXC1qXMFOUKanOLxnv6Lr2ns/mqMKTpqEFTxhxUVjHsA8h8pG/LDc+07fR9pyqX19q81F29Om3UpQi8yUl3NtJezL7DrlHTvKB5MtsUdRd7bUtOhdxqV7CMozlmWFiT49jwl0fTOTu3kH03T6O3r7U7ehTVevfVYedx6SpxxxjnuXfj1mny0bs2/PbctLhqNvdXcrqi5UKE1UkoxmnLOOi6Lv8QOc0bb9Ce29Z1bcMKUL7XKE619KeMUKTh6NNN90I46+Kz4H5jsqeM1H39Eeg+Uzyl3G8JrTNGVa10aOOan6M67/rYfxV3R+t92OjxioxUV2ICshWQARlIACAAoQAApCgCkKAKQoFBCgUEKBQQoFKYlApTEoFLkxyAMslyY5GQPh1aPSnP2o445fUI8rWT+S0ziAAAAAFXV4A9z8kHlH27om1IaTrV1KzrW1STjKVOU1VUpOXTinjHTtO8fC1sf58j92q/lPz7Q2LqM6UZ177R7Oo1mVveajTo1ab8JQk8xfqZn7w735627++KP4ge//C1sf58j92q/lHwtbH+fI/dqv5TwD3h3vz1t398UfxHvDvfnrbv74o/iB7/8LWx/nyP3ar+ULys7IfZra+7VvyngHvDvfnrbv74o/ichZbIvaVBL9LbfeW3lavS/ED3D4WNkfPS+61vyj4WNkfPS+61vyni3vNvvnXQP3tS/Ee82++ddA/e1L8QPafhZ2R89L7rW/Ka6/lT2JcUalGtrEZ06kXGcXa1sNNYa+KeNe82++ddA/e9L8Se82++ddA/e9L8QO+++TZ1L9XZeULXbS2h6NG2oUsU6MF8WEc0W8JYSy30RffRtb/7m7i/ul/8AAdB95t9866B+96X4j3mX3zroH73pfiB3TcG8NpUNpatY6Pqdzq+qapT8zXua1NxqzWGoym3GMWorCwlnB5L3HOahte/srWdwrjTruFNcpxsr2FecI98nGPVRXe+xZRwYAEAA1VaFKp8aPXxXQ2ADVZxudOu6d3p15Wtrim8wq05OMo+xo7LY+UPfFjKbp67UrKSxi4UamPWuS6M68APo0LXdwaBq1TVNMvpU7utnz05NTVXLy+Sfb16nK3G/t73KqqruCvFVE1JQ4xwn4YXT6jgQBrtp39tb1behqFxSoVv9bSpVJRjP2pPDNcLSlHtzL2m8ARJJYSSXqAAAgDAEKQACFAFIAKAAKCFAFIAKUgApSAClMSgUEKBQQAZDJABkDEoEqx50px8U0cGc7k4avHhWnHwkwNYAAGUPjx9qMSxeJJ+DA7zvm0t77yq6xb3daVKlK5nmUcZyoZS69OrSX19j7D5braWmurCnaa/aKfFzqRqzi0l5yUUoyTw5dF06dvcfbr9Hb26NZu9cqbotNPle1POu0rWtec6XdhyjFxfZ3HH+9vbf040/7jc/kA+XUts0bLT693HW9PrOkv8AUwn+sb5RXHHjiWX3dH1Gi7ZoappsLqWuadaVJVlTdG5nxaWUuX+J9Xvb239ONP8AuNz+Qe9vbf040/7jc/kA4m50elQ1+lpa1K1lCc4Qd11VOnyxnl7M9cZOwVdvQs7O7ktQta8rWhSqJUpL0nKWJR6vq4rq0vE+entnbkqkUt76e3ns9w3P5Dkve/oP0y077jcflAzuNt6W042mu0HU5JRdeKjBrzMajy03jq3H2rHaaq21oQzw1fT58eTkuSTilGbTaz2NwSWM/Hj2GX6A0H6Z6d9xuPyk97+g/TLTvuNx+UDitXs7SzqW0bO690xq2tOtNuCjwnKOXHtfYbNb0haSrZ+7LW68/ByaoSUnTaeMPDf1eJyX6A0H6Z6f9xuPyk/QGgrs3npy/wDwbj8oGEdsU5V50v0tZpQUX5x44Tz3xfLrFd76NeDPpp7RtJ20Jfp6whVbk5cmnFxxBpxw8v47z0XxXhGj3v6D9MtO+43H5R739B+mWnfcbj8oGWyklHceMf7iuuq7+sDrTO2W70jb1pqdS21231Wre2NSyjRt7erTcOePTbmkmlx7O3qdSAAgAAEAAEApAABAABAAAAAEAAhSACgAAUgAoAAFIAKUgAoIUCggApTEoFBABkCACjJABkcZfxxcN/KSZyR8OpLrTftA+IAAAAAAAAAAfTp8c3CfyU2cnk+DTV1qP2H3AXIyQAMjJABckyAABAAAIBSAAAQAACAUgAAAACAAAAB//9k=" width="480" height="300"/>', '#000'); };
  mocks['wax-reveal'] = function () { return wrap('<image href="data:image/jpeg;base64,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" width="480" height="300"/>', '#000'); };

  /* -------- Verifikat: a buyer checks a code */
  mocks.verify = function (lang) {
    var scr = '<rect width="150" height="250" fill="#f6f8fa"/>' +
      '<rect width="150" height="26" fill="#fff"/><rect y="26" width="150" height="1" fill="#e3e7ec"/>' +
      '<circle cx="14" cy="13" r="5" fill="#2f9e5b"/><text x="23" y="17" ' + F + ' font-size="10" font-weight="bold" fill="#1f2d3d">verifikat</text>' +
      '<circle cx="75" cy="62" r="20" fill="#e3f5ea"/><circle cx="75" cy="62" r="14" fill="#2f9e5b"/>' +
      '<path d="M68 62l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="75" y="98" text-anchor="middle" ' + F + ' font-size="11" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Товар подлинный', 'Genuine product') + '</text>' +
      '<text x="75" y="111" text-anchor="middle" ' + F + ' font-size="7.5" fill="#6b7785">' + L(lang, 'Код проверен впервые', 'Code checked for the first time') + '</text>' +
      '<rect x="10" y="122" width="130" height="66" rx="6" fill="#fff" stroke="#e3e7ec"/>' +
      '<rect x="18" y="130" width="34" height="34" rx="4" fill="#f2d7a6"/><path d="M27 158v-14c0-3 2-5 8-5s8 2 8 5v14z" fill="#d9a54c"/><rect x="29" y="146" width="12" height="6" fill="#fff" opacity=".7"/>' +
      '<text x="58" y="140" ' + F + ' font-size="8" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Мёд липовый, 250 г', 'Linden honey, 250 g') + '</text>' +
      '<text x="58" y="151" ' + F + ' font-size="7" fill="#6b7785">' + L(lang, 'Производитель: пример', 'Maker: sample') + '</text>' +
      '<text x="58" y="161" ' + F + ' font-size="7" fill="#6b7785">' + L(lang, 'Партия №24', 'Batch #24') + '</text>' +
      '<text x="18" y="180" font-family="monospace" font-size="6.5" fill="#8a96a3">0190f3c2-7b1e-7c40-9a…</text>' +
      '<rect x="10" y="198" width="130" height="22" rx="11" fill="#2f9e5b"/>' +
      '<text x="75" y="212" text-anchor="middle" ' + F + ' font-size="8" font-weight="bold" fill="#fff">' + L(lang, 'Подробнее о товаре', 'Product details') + '</text>' +
      '<text x="75" y="238" text-anchor="middle" ' + F + ' font-size="6.5" fill="#a0a9b4">verifikat.ru</text>';
    var pack =
      '<g transform="translate(270 52)">' +
      '<path d="M20 30h110l12 190H8z" fill="#f2d7a6" stroke="#c99a4f"/>' +
      '<rect x="40" y="0" width="70" height="34" rx="4" fill="#d9a54c" stroke="#a87412"/>' +
      '<rect x="26" y="70" width="98" height="120" rx="4" fill="#fff" stroke="#e0c08a"/>' +
      qr(45, 82, 60, 11) +
      '<text x="75" y="160" text-anchor="middle" ' + F + ' font-size="8" fill="#555">' + L(lang, 'Проверьте подлинность', 'Check authenticity') + '</text>' +
      '<text x="75" y="173" text-anchor="middle" ' + F + ' font-size="8" font-weight="bold" fill="#2f9e5b">vf3.ru</text>' +
      '<rect class="xpa-mock-scan" x="40" y="80" width="70" height="2" fill="#ff3b30" opacity=".85"/>' +
      '</g>' +
      '<path d="M236 150c10-8 22-8 30 0" fill="none" stroke="#9aa6b5" stroke-width="2" stroke-dasharray="4 4"/>' +
      '<path d="M262 145l6 5-7 3" fill="none" stroke="#9aa6b5" stroke-width="2"/>';
    return wrap(phone(70, 32, 150, 250, scr) + pack, '#e9eef4');
  };

  /* -------- Verifikat: manufacturer dashboard, batch generation */
  mocks.batches = function (lang) {
    var rows = [
      ['#24', L(lang, 'Мёд липовый', 'Linden honey'), '50 000', 'gen'],
      ['#23', L(lang, 'Мёд гречишный', 'Buckwheat honey'), '20 000', 'ok'],
      ['#22', L(lang, 'Пыльца, 100 г', 'Pollen, 100 g'), '5 000', 'mod'],
      ['#21', L(lang, 'Прополис', 'Propolis'), '2 000', 'draft']
    ];
    var chip = {
      ok: ['#e3f5ea', '#2f9e5b', L(lang, 'Подтверждена', 'Confirmed')],
      mod: ['#fff4d6', '#b07d00', L(lang, 'На модерации', 'In review')],
      draft: ['#eef0f3', '#6b7785', L(lang, 'Черновик', 'Draft')],
      gen: ['#e3eefc', '#2f6fe0', L(lang, 'Генерация', 'Generating')]
    };
    var b = '<rect x="20" y="16" width="440" height="268" rx="6" fill="#fff" stroke="#cfd6df"/>' +
      '<rect x="20" y="16" width="440" height="20" rx="6" fill="#e8ecf1"/><rect x="20" y="30" width="440" height="6" fill="#e8ecf1"/>' +
      '<circle cx="32" cy="26" r="3.5" fill="#ff5f57"/><circle cx="43" cy="26" r="3.5" fill="#febc2e"/><circle cx="54" cy="26" r="3.5" fill="#28c840"/>' +
      '<rect x="120" y="21" width="240" height="11" rx="5.5" fill="#fff"/><text x="240" y="29.5" text-anchor="middle" ' + F + ' font-size="7" fill="#8a96a3">manufacturers.verifikat.ru</text>' +
      '<rect x="20" y="36" width="92" height="248" fill="#1f2d3d"/>' +
      '<circle cx="34" cy="52" r="5" fill="#2f9e5b"/><text x="44" y="55.5" ' + F + ' font-size="9" font-weight="bold" fill="#fff">verifikat</text>';
    [L(lang, 'Товары', 'Products'), L(lang, 'Партии', 'Batches'), L(lang, 'Экспорт', 'Exports'), L(lang, 'Поддержка', 'Support')].forEach(function (n, i) {
      var y = 76 + i * 20;
      if (i === 1) b += '<rect x="24" y="' + (y - 11) + '" width="84" height="16" rx="3" fill="#2f9e5b"/>';
      b += '<text x="34" y="' + y + '" ' + F + ' font-size="8" fill="' + (i === 1 ? '#fff' : '#b8c2cc') + '">' + n + '</text>';
    });
    b += '<text x="126" y="58" ' + F + ' font-size="12" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Партии кодов', 'Code batches') + '</text>' +
      '<rect x="380" y="46" width="68" height="18" rx="4" fill="#2f9e5b"/><text x="414" y="58" text-anchor="middle" ' + F + ' font-size="8" fill="#fff">+ ' + L(lang, 'Партия', 'Batch') + '</text>' +
      '<rect x="126" y="74" width="322" height="16" fill="#f3f5f8"/>';
    [[132, L(lang, 'Партия', 'Batch')], [170, L(lang, 'Товар', 'Product')], [282, L(lang, 'Кодов', 'Codes')], [334, L(lang, 'Статус', 'Status')]].forEach(function (c) {
      b += '<text x="' + c[0] + '" y="85" ' + F + ' font-size="7.5" font-weight="bold" fill="#6b7785">' + c[1] + '</text>';
    });
    rows.forEach(function (r, i) {
      var y = 106 + i * 26, c = chip[r[3]];
      b += '<text x="132" y="' + y + '" ' + F + ' font-size="8" fill="#1f2d3d">' + r[0] + '</text>' +
        '<text x="170" y="' + y + '" ' + F + ' font-size="8" fill="#1f2d3d">' + r[1] + '</text>' +
        '<text x="282" y="' + y + '" ' + F + ' font-size="8" fill="#1f2d3d">' + r[2] + '</text>' +
        '<rect x="334" y="' + (y - 9) + '" width="62" height="13" rx="6.5" fill="' + c[0] + '"/>' +
        '<text x="365" y="' + (y + 0.5) + '" text-anchor="middle" ' + F + ' font-size="7" fill="' + c[1] + '">' + c[2] + '</text>' +
        '<rect x="126" y="' + (y + 8) + '" width="322" height="1" fill="#edf0f3"/>';
    });
    b += '<rect x="126" y="214" width="322" height="58" rx="5" fill="#f7faff" stroke="#cfe0fb"/>' +
      '<text x="138" y="232" ' + F + ' font-size="8.5" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Партия #24: генерация кодов', 'Batch #24: generating codes') + '</text>' +
      '<text x="436" y="232" text-anchor="end" ' + F + ' font-size="8" fill="#6b7785">WebSocket ●</text>' +
      '<rect x="138" y="241" width="298" height="9" rx="4.5" fill="#e3e9f2"/>' +
      '<rect class="xpa-mock-bar" x="138" y="241" width="186" height="9" rx="4.5" fill="#2f6fe0"/>' +
      '<text x="138" y="264" ' + F + ' font-size="7.5" fill="#6b7785">31 000 / 50 000 · ' + L(lang, 'Отменить', 'Cancel') + '</text>';
    return wrap(b, '#dfe6ef');
  };

  /* -------- Verifikat: QR tape export */
  mocks.tape = function (lang) {
    var b = '<rect x="0" y="0" width="480" height="300" fill="#e6e2da"/>' +
      '<g transform="rotate(-6 240 150)">' +
      '<rect x="30" y="92" width="430" height="92" fill="#fff" stroke="#cfc8b8"/>';
    for (var i = 0; i < 6; i++) {
      var x = 42 + i * 70;
      b += (i === 0 ? qr(x, 102, 52, 3, '#fff', '#d6342a') : qr(x, 102, 52, 20 + i * 13)) +
        '<text x="' + (x + 26) + '" y="170" text-anchor="middle" font-family="monospace" font-size="6.5" fill="' + (i === 0 ? '#d6342a' : '#666') + '">' + (i === 0 ? L(lang, 'МАСТЕР', 'MASTER') : '0190F3C2…' + (i + 4)) + '</text>' +
        '<path d="M' + (x + 61) + ' 92v92" stroke="#bbb" stroke-dasharray="3 3"/>';
    }
    b += '</g>' +
      '<g transform="translate(40 206)"><rect width="150" height="72" rx="4" fill="#fff" stroke="#bdb6a6"/>' +
      '<rect x="10" y="10" width="26" height="32" fill="#f6d04d" stroke="#a88a1a"/><path d="M23 10v32" stroke="#a88a1a" stroke-dasharray="2 2"/>' +
      '<text x="44" y="21" ' + F + ' font-size="8.5" font-weight="bold" fill="#333">batch-24.zip</text>' +
      '<text x="44" y="33" font-family="monospace" font-size="7" fill="#666">part-001.pdf … part-016.pdf</text>' +
      '<text x="10" y="60" ' + F + ' font-size="7.5" fill="#666">' + L(lang, 'векторные QR · лента 30 мм', 'vector QR · 30 mm tape') + '</text></g>' +
      '<g transform="translate(214 214)"><text ' + F + ' font-size="10" font-weight="bold" fill="#333">' + L(lang, 'Память постоянна', 'Flat memory') + '</text>' +
      '<path d="M0 46h210" stroke="#999"/><path d="M0 46V12" stroke="#999"/>' +
      '<path d="M2 44c40-2 80-26 120-30" fill="none" stroke="#d6342a" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<path d="M2 36h204" fill="none" stroke="#2f9e5b" stroke-width="2.4"/>' +
      '<text x="124" y="14" ' + F + ' font-size="7" fill="#d6342a">' + L(lang, 'один документ', 'one document') + '</text>' +
      '<text x="140" y="31" ' + F + ' font-size="7" fill="#2f9e5b">' + L(lang, 'постранично', 'page by page') + '</text>' +
      '<text x="0" y="60" ' + F + ' font-size="7" fill="#777">' + L(lang, 'до ~800 тыс. кодов в партии', 'up to ~800k codes per batch') + '</text></g>';
    return wrap(b);
  };

  /* -------- Kompi (relocation matcher): brand mark, sky, quiz, report, bot */
  var KB = '#0a7ff2', KI = '#10233f', KI2 = '#5a6b82';
  function kmark(x, y, size, color, hub) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + size / 64 + ')">' +
      '<circle cx="32" cy="32" r="26" fill="none" stroke="' + color + '" stroke-width="6"/>' +
      '<path d="M32 14.5L36.6 27.4 49.5 32 36.6 36.6 32 49.5 27.4 36.6 14.5 32 27.4 27.4z" fill="' + color + '" stroke="' + color + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="32" r="3" fill="' + hub + '"/></g>';
  }
  function ksky(w, h, id, plain) {
    return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6fc4"/><stop offset=".55" stop-color="#4fa3e0"/><stop offset="1" stop-color="#bfe4fb"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>' + (plain ? '' :
      '<g class="xpa-mock-drift" fill="#fff" opacity=".8"><ellipse cx="' + w * 0.2 + '" cy="' + h * 0.2 + '" rx="26" ry="7"/><ellipse cx="' + w * 0.26 + '" cy="' + (h * 0.2 - 5) + '" rx="14" ry="7"/>' +
      '<ellipse cx="' + w * 0.8 + '" cy="' + h * 0.34 + '" rx="30" ry="8"/><ellipse cx="' + w * 0.75 + '" cy="' + (h * 0.34 - 6) + '" rx="15" ry="8"/></g>');
  }

  mocks['kompy-quiz'] = function (lang) {
    var w = 150, h = 250;
    var s = ksky(w, h, 'kq-sky', true) + kmark(8, 8, 13, '#fff', '#2a78c9') +
      '<text x="25" y="18" ' + F + ' font-size="8.5" font-weight="bold" fill="#fff">' + L(lang, 'Компи', 'Kompi') + '</text>' +
      '<text x="142" y="18" text-anchor="end" ' + F + ' font-size="7" fill="#eaf5ff">7 / 12</text>' +
      '<rect x="8" y="27" width="134" height="3" rx="1.5" fill="#fff" opacity=".35"/><rect x="8" y="27" width="78" height="3" rx="1.5" fill="#fff"/>' +
      '<rect x="8" y="40" width="134" height="200" rx="10" fill="#fff"/>' +
      '<text x="18" y="60" ' + F + ' font-size="8.5" font-weight="bold" fill="' + KI + '">' + L(lang, 'Что для вас важнее', 'What matters most') + '</text>' +
      '<text x="18" y="71" ' + F + ' font-size="8.5" font-weight="bold" fill="' + KI + '">' + L(lang, 'всего в новой стране?', 'in a new country?') + '</text>';
    [L(lang, 'Быстро получить ВНЖ', 'A fast residence permit'), L(lang, 'Низкие налоги', 'Low taxes'), L(lang, 'Путь к гражданству', 'A path to citizenship'), L(lang, 'Тёплый климат', 'A warm climate'), L(lang, 'Школа для детей', 'Schools for kids')].forEach(function (o, i) {
      var y = 82 + i * 25, on = i === 0 || i === 3;
      s += '<rect x="16" y="' + y + '" width="118" height="20" rx="6" fill="' + (on ? '#e6f2fe' : '#f4f8fd') + '" stroke="' + (on ? KB : '#dbe5f1') + '"/>' +
        '<rect x="22" y="' + (y + 5.5) + '" width="9" height="9" rx="2.5" fill="' + (on ? KB : '#fff') + '" stroke="' + (on ? KB : '#b9c6d8') + '"/>' +
        (on ? '<path d="M24 ' + (y + 10) + 'l2 2 3.6-4" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
        '<text x="36" y="' + (y + 13) + '" ' + F + ' font-size="7.2" fill="' + KI + '">' + o + '</text>';
    });
    s += '<rect x="16" y="212" width="118" height="20" rx="10" fill="' + KB + '"/><text x="75" y="225" text-anchor="middle" ' + F + ' font-size="8" font-weight="bold" fill="#fff">' + L(lang, 'Дальше', 'Next') + '</text>';
    var side = '<g transform="translate(250 34)" ' + F + '>' +
      '<text font-size="11" font-weight="bold" fill="' + KI + '">' + L(lang, 'Адаптивные вопросы', 'Adaptive questions') + '</text>' +
      '<rect y="12" width="200" height="34" rx="4" fill="#fff" stroke="#cfd6df"/>' +
      '<text x="10" y="26" font-size="8" font-weight="bold" fill="' + KI + '">' + L(lang, 'Базовый блок', 'Base block') + '</text>' +
      '<text x="10" y="38" font-size="7.2" fill="' + KI2 + '">' + L(lang, 'гражданство, доход, семья, цели', 'citizenship, income, family, goals') + '</text>' +
      '<path d="M100 50v12" stroke="#9aa6b5" stroke-width="2"/><path d="M95 58l5 6 5-6" fill="none" stroke="#9aa6b5" stroke-width="2"/>' +
      '<rect y="68" width="200" height="34" rx="4" fill="#e6f2fe" stroke="' + KB + '"/>' +
      '<text x="10" y="82" font-size="8" font-weight="bold" fill="#0554b4">POST /preliminary</text>' +
      '<text x="10" y="94" font-size="7.2" fill="' + KI2 + '">' + L(lang, 'бэкенд считает трёх кандидатов', 'the backend computes three candidates') + '</text>' +
      '<path d="M100 106v12" stroke="#9aa6b5" stroke-width="2"/><path d="M95 114l5 6 5-6" fill="none" stroke="#9aa6b5" stroke-width="2"/>' +
      '<rect y="124" width="200" height="56" rx="4" fill="#fff" stroke="#cfd6df"/>' +
      '<text x="10" y="138" font-size="8" font-weight="bold" fill="' + KI + '">' + L(lang, 'Вопросы только про них', 'Questions only about them') + '</text>';
    [L(lang, 'страна А', 'country A'), L(lang, 'страна Б', 'country B'), L(lang, 'страна В', 'country C')].forEach(function (c, i) {
      side += '<rect x="' + (10 + i * 62) + '" y="148" width="56" height="20" rx="10" fill="#f4f8fd" stroke="#dbe5f1"/><text x="' + (38 + i * 62) + '" y="161" text-anchor="middle" font-size="7.2" fill="' + KI + '">' + c + '</text>';
    });
    side += '<text y="198" font-size="7.5" fill="#6b7785">' + L(lang, 'схема экрана, данные условные', 'screen sketch, sample data') + '</text></g>';
    return wrap(phone(70, 32, w, h, s, false) + side, '#e9eef4');
  };

  mocks['kompy-report'] = function (lang) {
    var b = '<svg x="0" y="0" width="480" height="300" viewBox="0 0 480 300">' + ksky(480, 300, 'kr-sky') + '</svg>' +
      '<defs><filter id="kr-blur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>' +
      kmark(18, 12, 18, '#fff', '#2472c6') +
      '<text x="42" y="26" ' + F + ' font-size="12" font-weight="bold" fill="#fff">' + L(lang, 'Вам подходят', 'Your matches') + '</text>' +
      '<text x="462" y="26" text-anchor="end" ' + F + ' font-size="8.5" fill="#eaf5ff">' + L(lang, '21 страна · ~140 маршрутов', '21 countries · ~140 routes') + '</text>';
    var rows = [
      [L(lang, 'Страна А', 'Country A'), L(lang, 'ВНЖ для удалённой работы', 'Remote work residence permit'), 92, [L(lang, 'доход проходит порог с запасом', 'income clears the threshold with room'), L(lang, 'семья включается в заявку', 'family is included in the application')]],
      [L(lang, 'Страна Б', 'Country B'), L(lang, 'ВНЖ по доходу', 'Income-based residence permit'), 84, [L(lang, 'низкая стоимость жизни', 'low cost of living'), L(lang, 'бюджет впритык: сбережений на 5 месяцев', 'tight budget: savings cover 5 months')]],
      [L(lang, 'Страна В', 'Country C'), L(lang, 'Виза предпринимателя', 'Entrepreneur visa'), 77, [L(lang, 'быстрый срок рассмотрения', 'fast processing time'), L(lang, 'нужен местный счёт', 'a local bank account is required')]]
    ];
    rows.forEach(function (r, i) {
      var y = 42 + i * 82, blur = i > 0;
      b += '<rect x="18" y="' + y + '" width="444" height="74" rx="10" fill="#fff"/>' +
        '<circle cx="46" cy="' + (y + 26) + '" r="14" fill="#e6f2fe"/><text x="46" y="' + (y + 30.5) + '" text-anchor="middle" ' + F + ' font-size="13" font-weight="bold" fill="' + KB + '">' + (i + 1) + '</text>' +
        '<g' + (blur ? ' filter="url(#kr-blur)"' : '') + '>' +
        '<text x="70" y="' + (y + 22) + '" ' + F + ' font-size="11" font-weight="bold" fill="' + KI + '">' + r[0] + '</text>' +
        '<text x="70" y="' + (y + 35) + '" ' + F + ' font-size="8.5" fill="' + KI2 + '">' + r[1] + '</text>' +
        '<circle cx="74" cy="' + (y + 50) + '" r="3" fill="#2f9e5b"/><text x="82" y="' + (y + 53) + '" ' + F + ' font-size="8" fill="' + KI + '">' + r[3][0] + '</text>' +
        '<circle cx="74" cy="' + (y + 63) + '" r="3" fill="' + (i === 0 ? '#2f9e5b' : '#e0a100') + '"/><text x="82" y="' + (y + 66) + '" ' + F + ' font-size="8" fill="' + KI + '">' + r[3][1] + '</text></g>' +
        '<rect x="330" y="' + (y + 20) + '" width="90" height="7" rx="3.5" fill="#e3ebf5"/><rect class="xpa-mock-grow" x="330" y="' + (y + 20) + '" width="' + (r[2] * 0.9) + '" height="7" rx="3.5" fill="' + KB + '"/>' +
        '<text x="448" y="' + (y + 27) + '" text-anchor="end" ' + F + ' font-size="10" font-weight="bold" fill="' + KI + '">' + r[2] + '</text>';
      if (blur && i === 1) {
        b += '<rect x="316" y="' + (y + 42) + '" width="134" height="22" rx="11" fill="' + KB + '"/>' +
          '<text x="383" y="' + (y + 56.5) + '" text-anchor="middle" ' + F + ' font-size="8.5" font-weight="bold" fill="#fff">' + L(lang, 'Полный отчёт в Telegram', 'Full report in Telegram') + '</text>';
      }
    });
    return wrap(b);
  };

  mocks['kompy-bot'] = function (lang) {
    var b = '<rect width="480" height="300" fill="#cfdde6"/>' +
      '<rect x="90" y="0" width="300" height="300" fill="#dfe9ef"/>' +
      '<rect x="90" y="0" width="300" height="34" fill="#fff"/>' +
      '<circle cx="112" cy="17" r="10" fill="' + KB + '"/>' + kmark(105, 10, 14, '#fff', KB) +
      '<text x="128" y="15" ' + F + ' font-size="9" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Компи', 'Kompi') + '</text>' +
      '<text x="128" y="26" ' + F + ' font-size="7" fill="#8a96a3">' + L(lang, 'бот', 'bot') + '</text>' +
      // user /start with a payload
      '<rect x="326" y="44" width="52" height="20" rx="8" fill="#e1ffc7"/><text x="352" y="57" text-anchor="middle" ' + F + ' font-size="8" fill="#2a6">/start</text>' +
      // bot: report is being prepared
      '<rect x="100" y="72" width="214" height="46" rx="8" fill="#fff"/>' +
      '<text x="110" y="88" ' + F + ' font-size="8.5" font-weight="bold" fill="#1f2d3d">' + L(lang, 'Ваш отчёт готов', 'Your report is ready') + '</text>' +
      '<text x="110" y="101" ' + F + ' font-size="7.5" fill="#333">' + L(lang, 'Три страны, маршруты, бюджет и риски.', 'Three countries, routes, budget and risks.') + '</text>' +
      '<text x="110" y="111" ' + F + ' font-size="7.5" fill="#333">' + L(lang, 'Файл ниже, его можно переслать.', 'The file is below, feel free to forward it.') + '</text>' +
      // bot: the PDF document
      '<rect x="100" y="124" width="214" height="58" rx="8" fill="#fff"/>' +
      '<rect x="110" y="134" width="30" height="38" rx="3" fill="#e5484d"/><path d="M132 134v8h8" fill="#f4a3a5"/>' +
      '<text x="125" y="162" text-anchor="middle" ' + F + ' font-size="8" font-weight="bold" fill="#fff">PDF</text>' +
      '<text x="148" y="148" ' + F + ' font-size="8.5" font-weight="bold" fill="#1f2d3d">kompi-report.pdf</text>' +
      '<text x="148" y="160" ' + F + ' font-size="7.5" fill="#8a96a3">' + L(lang, 'PDF из HTML и CSS', 'PDF from HTML and CSS') + '</text>' +
      '<rect class="xpa-mock-grow" x="148" y="166" width="150" height="3" rx="1.5" fill="' + KB + '"/>' +
      // inline buttons
      '<rect x="100" y="186" width="105" height="20" rx="6" fill="#f3f7fa" stroke="#c8d6e0"/><text x="152.5" y="199" text-anchor="middle" ' + F + ' font-size="8" fill="#2a7fd4">' + L(lang, 'Гайд по стране', 'Country guide') + '</text>' +
      '<rect x="209" y="186" width="105" height="20" rx="6" fill="#f3f7fa" stroke="#c8d6e0"/><text x="261.5" y="199" text-anchor="middle" ' + F + ' font-size="8" fill="#2a7fd4">' + L(lang, 'Пройти заново', 'Take it again') + '</text>' +
      // moderation of a news post
      '<rect x="100" y="216" width="230" height="52" rx="8" fill="#fff"/>' +
      '<text x="110" y="231" ' + F + ' font-size="7" font-weight="bold" fill="#8a96a3">' + L(lang, 'ДЛЯ МОДЕРАТОРА', 'FOR THE MODERATOR') + '</text>' +
      '<text x="110" y="244" ' + F + ' font-size="7.5" fill="#333">' + L(lang, 'Черновик новости от агента готов.', 'The agent\'s news draft is ready.') + '</text>' +
      '<text x="110" y="256" ' + F + ' font-size="7.5" fill="#333">' + L(lang, 'Проверьте факты перед публикацией.', 'Check the facts before publishing.') + '</text>' +
      '<rect x="100" y="272" width="113" height="20" rx="6" fill="#e3f5ea" stroke="#9fd3b3"/><text x="156.5" y="285" text-anchor="middle" ' + F + ' font-size="8" fill="#1f7a45">' + L(lang, 'Опубликовать', 'Publish') + '</text>' +
      '<rect x="217" y="272" width="113" height="20" rx="6" fill="#f3f7fa" stroke="#c8d6e0"/><text x="273.5" y="285" text-anchor="middle" ' + F + ' font-size="8" fill="#8a96a3">' + L(lang, 'Отклонить', 'Reject') + '</text>';
    return wrap(b);
  };

  mocks.generic = function (lang, title) {
    return wrap('<rect x="40" y="40" width="400" height="220" rx="6" fill="#fff" stroke="#cfd6df"/>' +
      '<text x="240" y="155" text-anchor="middle" ' + F + ' font-size="14" fill="#6b7785">' + esc(title || L(lang, 'Скриншот скоро', 'Screenshot soon')) + '</text>');
  };

  window.XPApps.mocks = mocks;
  window.XPApps.qrSvg = function (size, seed) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '">' + qr(0, 0, size, seed) + '</svg>'; };
})();

export {};
