import type { UIScanGroup } from '../main/scan';
import { attachTooltip } from './tooltip';
import { state } from './state';
import { formatLineHeight, formatLetterSpacing } from '../main/utils/text';

const $groups = document.getElementById('groups') as HTMLDivElement;
const $matchBox = document.getElementById('matchBox') as HTMLDivElement;
const $existingList = document.getElementById('existingList') as HTMLSelectElement;
const $more = document.getElementById('showMore') as HTMLButtonElement;

function headerText(g: UIScanGroup) {
  const title = g.preview && g.preview.title ? g.preview.title : '';
  return title + ' — ' + String(g.count) + ' фрагментов';
}

function metaShort(g: UIScanGroup) {
  return (
    g.preview.family +
    ' ' +
    g.preview.style +
    ' · ' +
    g.preview.size +
    'px · LH ' +
    formatLineHeight(g.preview.lineHeight) +
    ' · LS ' +
    formatLetterSpacing(g.preview.letterSpacing)
  );
}

function metaFull(g: UIScanGroup) {
  return (
    g.preview.family +
    ' ' +
    g.preview.style +
    ' · ' +
    g.preview.size +
    'px · LH ' +
    formatLineHeight(g.preview.lineHeight) +
    ' · LS ' +
    formatLetterSpacing(g.preview.letterSpacing) +
    ' · Psp ' +
    g.preview.paragraphSpacing +
    ' · Pind ' +
    g.preview.paragraphIndent +
    ' · Case ' +
    g.preview.textCase +
    ' · Dec ' +
    g.preview.textDecoration
  );
}

export function fillMatchesUI(g: UIScanGroup) {
  $existingList.innerHTML = '';
  const list = g.matches || [];
  for (let i = 0; i < list.length; i++) {
    const opt = document.createElement('option');
    opt.value = list[i].id;
    opt.textContent = list[i].name;
    $existingList.appendChild(opt);
  }
  if (list.length > 0) {
    $existingList.selectedIndex = 0;
    state.selectedMatch = list[0];
    $matchBox.style.display = 'block';
  } else {
    state.selectedMatch = null;
    const chk = document.getElementById('useExisting') as HTMLInputElement;
    chk.checked = false;
    $matchBox.style.display = 'none';
  }
}

export function renderGroups(append: boolean) {
  if (!append) $groups.innerHTML = '';
  if (!state.groups.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Совпадений не найдено.';
    $groups.appendChild(empty);
    state.selectedId = null;
    state.selectedMatch = null;
    const chk = document.getElementById('useExisting') as HTMLInputElement;
    const box = document.getElementById('matchBox') as HTMLDivElement;
    chk.checked = false;
    box.style.display = 'none';
    $more.style.display = 'none';
    return;
  }

  for (let i = 0; i < state.groups.length; i++) {
    const g = state.groups[i];
    if (document.getElementById('group-' + g.id)) continue;

    const item = document.createElement('label');
    item.className = 'item';
    item.id = 'group-' + g.id;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'grp';
    radio.value = g.id;
    radio.style.marginTop = '2px';
    if (i === 0 && !append) radio.checked = true;

    const box = document.createElement('div');

    const head = document.createElement('div');
    head.className = 'head';

    const headText = document.createElement('span');
    headText.textContent = headerText(g);
    head.appendChild(headText);

    if (g.styled) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Есть стиль: ' + (g.styleName || '');
      head.appendChild(b);
    }

    const tip = document.createElement('span');
    tip.className = 'tip';
    tip.textContent = 'i';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.title = metaFull(g);
    meta.textContent = metaShort(g);

    head.appendChild(tip);
    box.appendChild(head);
    box.appendChild(meta);

    item.appendChild(radio);
    item.appendChild(box);
    $groups.appendChild(item);

    attachTooltip(tip, metaFull(g));
  }

  if (!append && state.groups.length) {
    const first = state.groups[0];
    state.selectedId = first.id;
    fillMatchesUI(first);
  }

  const radios = $groups.querySelectorAll('input[name="grp"]');
  for (let r = 0; r < radios.length; r++) {
    radios[r].addEventListener('change', function (e: Event) {
      const target = e.target as HTMLInputElement;
      const id = target.value;
      let g: UIScanGroup | null = null;
      for (let j = 0; j < state.groups.length; j++) {
        if (state.groups[j].id === id) {
          g = state.groups[j];
          break;
        }
      }
      state.selectedId = id;
      if (g) fillMatchesUI(g);
      setApplyEnabled();
    });
  }

  $more.style.display = state.hasMore ? 'inline-block' : 'none';
  setApplyEnabled();
}

function setApplyEnabled() {
  const $apply = document.getElementById('apply') as HTMLButtonElement;
  const $styleName = document.getElementById('styleName') as HTMLInputElement;
  const $useExisting = document.getElementById('useExisting') as HTMLInputElement;

  const hasGroup = !!state.selectedId;
  const name = $styleName.value ? $styleName.value.trim() : '';
  const useExist = !!$useExisting.checked;
  const ok = hasGroup && ((useExist && state.selectedMatch) || (!useExist && name.length > 0));
  $apply.disabled = !ok;
}
