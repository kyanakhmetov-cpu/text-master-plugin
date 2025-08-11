const tt = document.getElementById('tooltip') as HTMLDivElement;

export function attachTooltip(host: HTMLElement, text: string) {
  host.addEventListener('mouseenter', function () {
    tt.textContent = text;

    const rect = host.getBoundingClientRect();
    tt.style.top = '0px';
    tt.style.left = '0px';
    tt.className = 'show';
    const ttr = tt.getBoundingClientRect();

    const gap = 8;
    let top = rect.top - ttr.height - gap;
    let left = rect.left + rect.width / 2 - ttr.width / 2;

    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    if (left < 8) left = 8;
    if (left + ttr.width > vw - 8) left = vw - 8 - ttr.width;
    if (top < 8) top = rect.bottom + gap;

    tt.style.left = String(Math.round(left)) + 'px';
    tt.style.top = String(Math.round(top)) + 'px';
    tt.className = 'show';
  });

  function hide() {
    tt.className = '';
    tt.style.top = '-1000px';
    tt.style.left = '-1000px';
    tt.textContent = '';
  }
  host.addEventListener('mouseleave', hide);
  host.addEventListener('blur', hide);
}
