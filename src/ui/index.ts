import type { UIScanGroup } from '../main/scan';
import { state } from './state';
import { renderGroups, fillMatchesUI } from './renderGroups';

const $groups = document.getElementById('groups') as HTMLDivElement;
const $scan = document.getElementById('scan') as HTMLButtonElement;
const $apply = document.getElementById('apply') as HTMLButtonElement;
const $styleName = document.getElementById('styleName') as HTMLInputElement;
const $status = document.getElementById('status') as HTMLDivElement;
const $matchBox = document.getElementById('matchBox') as HTMLDivElement;
const $useExisting = document.getElementById('useExisting') as HTMLInputElement;
const $existingList = document.getElementById('existingList') as HTMLSelectElement;
const $scope = document.getElementById('scope') as HTMLSelectElement;
const $heavy = document.getElementById('heavy') as HTMLDivElement;
const $heavyStats = document.getElementById('heavyStats') as HTMLDivElement;
const $more = document.getElementById('showMore') as HTMLButtonElement;

function setApplyEnabled() {
  const hasGroup = !!state.selectedId;
  const name = $styleName.value ? $styleName.value.trim() : '';
  const useExist = !!$useExisting.checked;
  const ok = hasGroup && ((useExist && state.selectedMatch) || (!useExist && name.length > 0));
  $apply.disabled = !ok;
}

function handleScanResult(msg: any) {
  state.page = msg.page || 0;
  state.pageSize = msg.pageSize || 50;
  state.hasMore = !!msg.hasMore;
  const newGroups: UIScanGroup[] = msg.groups || [];
  state.groups = state.page === 0 ? newGroups.slice() : state.groups.concat(newGroups);
  renderGroups(state.page > 0);
  $status.textContent = 'Показано элементов: ' + String(state.groups.length) + (state.hasMore ? ' (доступно ещё)' : '');
  if (msg.heavy) {
    $heavy.style.display = 'block';
    const st = msg.stats;
    $heavyStats.textContent =
      'Текстовых узлов: ' + String(st.textNodes) + ', сегментов: ' + String(st.segments) + ', групп: ' + String(st.groupsTotal) + '.';
  } else {
    $heavy.style.display = 'none';
  }
}

window.onmessage = function (event: MessageEvent) {
  const msg = event.data && event.data.pluginMessage ? event.data.pluginMessage : null;
  if (!msg) return;

  if (msg.type === 'scan-result') {
    handleScanResult(msg);
  }
  if (msg.type === 'done') {
    let extra = '';
    if (msg.usedExisting && msg.usedExistingName) extra = ' · использован существующий стиль «' + String(msg.usedExistingName) + '»';
    if (msg.createdOrUpdatedName) extra = extra + ' · применён стиль «' + String(msg.createdOrUpdatedName) + '»';
    $status.textContent = 'Готово. Применено фрагментов: ' + String(msg.applied) + extra;
  }
  if (msg.type === 'error') {
    $status.textContent = 'Ошибка: ' + String(msg.message);
  }
};

$scan.onclick = function () {
  const scope = ($scope.value as any) || 'selection';
  $status.textContent = 'Сканирую…';
  state.groups = [];
  state.hasMore = false;
  state.page = 0;
  $groups.innerHTML = '<div class="empty">Сканирование…</div>';
  parent.postMessage({ pluginMessage: { type: 'scan', scope: scope, page: 0, pageSize: state.pageSize } }, '*');
};

$more.onclick = function () {
  if (!state.hasMore) return;
  parent.postMessage({ pluginMessage: { type: 'scan-more' } }, '*');
};

$apply.onclick = function () {
  if (!state.selectedId) {
    $status.textContent = 'Выбери элемент.';
    return;
  }
  const name = $styleName.value ? $styleName.value.trim() : '';
  const useExisting = !!$useExisting.checked;
  let existingStyleId: string | null = null;
  if (useExisting) {
    const idx = $existingList.selectedIndex;
    if (idx >= 0) existingStyleId = $existingList.options[idx].value;
    if (!existingStyleId) {
      $status.textContent = 'Выбери существующий стиль.';
      return;
    }
  } else {
    if (!name) {
      $status.textContent = 'Введи имя стиля или выбери существующий.';
      return;
    }
  }
  $status.textContent = 'Применяю…';
  parent.postMessage(
    {
      pluginMessage: {
        type: 'apply',
        groupId: state.selectedId,
        styleName: name,
        useExisting: useExisting,
        existingStyleId: existingStyleId
      }
    },
    '*'
  );
};

$styleName.addEventListener('input', setApplyEnabled);
$useExisting.addEventListener('change', setApplyEnabled);
$existingList.addEventListener('change', function () {
  const idx = $existingList.selectedIndex;
  if (idx >= 0) {
    const id = $existingList.options[idx].value;
    const name = $existingList.options[idx].textContent || '';
    state.selectedMatch = { id: id, name: name };
  } else {
    state.selectedMatch = null;
  }
  setApplyEnabled();
});

$scope.value = 'selection';
$scan.click();
