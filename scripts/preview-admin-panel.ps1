param([string]$OutputDirectory = 'coverage/admin-panel-preview')

# Lokale HTML-preview met fictieve browser-RPC's; geen Google- of libraryaanroepen.
$projectRoot = Split-Path $PSScriptRoot -Parent
$target = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $target | Out-Null
$html = Get-Content -Raw -Encoding utf8 (Join-Path $projectRoot 'common/spreadsheet/admin-panel.html')
$html = $html.Replace('<?= initialSection ?>', 'overview')
$mock = @'
<script>
window.previewCalls = [];
window.previewFailRead = false;
window.previewSelectionStatus = 'READY';
window.previewErrors = [];
window.addEventListener('error', event => window.previewErrors.push(event.message));
const previewSnapshot = {
  checkedAt:'2026-10-03T12:00:00Z', account:'beheer@example.invalid',
  actions:[
    {id:'calendar',group:'processing',label:'Publiceer naar Calendar',description:'Verwerkt alle klaarstaande rijen in de vier invoerbladen.'},
    {id:'archive',group:'maintenance',label:'Archiveer auditlog',description:'Archiveer oude auditregels en verwijder de gecontroleerde regels.',confirm:true},
    {id:'website',group:'website',label:'Werk websitewerkvoorraad bij',description:'Voegt nieuwe publicaties toe.'}
  ],
  triggers:['Calendar','Vluchtimport','Hotelimport','Websitewerkvoorraad','Notificatiecontrole','Notificatieverwerking','Statustabblad']
    .map((label,i) => ({id:'trigger'+i,label,count:i === 1 ? 0 : i === 2 ? 2 : 1,interval:'5 minuten'})),
  sources:[
    {id:'gig',name:'gig-input',waiting:3,errorCount:1,url:'#gig',errors:[{row:4,message:'Verplicht veld ontbreekt: Title',url:'#row4'}]},
    {id:'flight',name:'flight-input',waiting:2,errorCount:0,url:'#flight',errors:[]},
    {id:'hotel',name:'hotel-input',waiting:0,errorCount:0,url:'#hotel',errors:[]},
    {id:'blockedDate',name:'blocked-date-input',waiting:0,errorCount:0,url:'#blocked',errors:[]},
    {id:'website',name:'website-publications',waiting:4,errorCount:0,url:'#website',errors:[]}
  ]
};
function previewRunner(success, failure) {
  return new Proxy({}, {get(target, name) {
    if (name === 'withSuccessHandler') return callback => previewRunner(callback, failure);
    if (name === 'withFailureHandler') return callback => previewRunner(success, callback);
    return (...args) => {
      window.previewCalls.push({name,args});
      setTimeout(() => {
        if (name === 'getAdminPanelSnapshot') {
          if (window.previewFailRead) failure(new Error('Fictieve leesfout'));
          else success(previewSnapshot);
        } else if (name === 'getAdminPanelSelection') success({gigId:'demo-1',title:'Voorbeeldoptreden',status:window.previewSelectionStatus,revision:'demo-revision'});
        else success({tone:'neutral',message:'Fictieve actie afgerond.'});
      }, 5);
    };
  }});
}
window.google = {script:{run:previewRunner()}};
</script>
<style>body { width:100%; max-width:300px; min-height:100vh; border-right:1px solid #e3e7e5; }</style>
'@
$checks = @'
<script>
(async () => {
  const wait = () => new Promise(resolve => setTimeout(resolve, 30));
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const choose = value => { document.getElementById('section').value = value; document.getElementById('section').dispatchEvent(new Event('change')); };
  const click = text => [...document.querySelectorAll('button')].find(node => node.textContent === text).click();
  const mutations = () => window.previewCalls.filter(call => !call.name.startsWith('get')).length;
  const result = document.createElement('output'); result.id = 'preview-tests';
  try {
    await wait();
    assert(document.querySelectorAll('.error-item').length === 1, 'Foutregel ontbreekt');
    assert(mutations() === 0, 'Openen mag geen actie starten');
    previewSnapshot.sources[0].errors[0].message = '<img src=x onerror=alert(1)>';
    click('Ververs overzicht'); await wait();
    assert(document.querySelectorAll('#content img').length === 0, 'Sheettekst mag geen HTML worden');
    previewSnapshot.sources[0].errors[0].message = 'Verplicht veld ontbreekt: Title';
    choose('automation');
    assert(document.querySelectorAll('#content .badge').length === 7, 'Triggerkaarten ontbreken');
    click('Installeren');
    assert(mutations() === 0, 'Installatie wacht op bevestiging');
    click('Annuleren');
    assert(mutations() === 0, 'Annuleren mag niets wijzigen');
    choose('website'); click('Laad geselecteerde publicatie');
    assert(document.getElementById('refresh').disabled, 'Acties blokkeren tijdens laden');
    await wait(); click('Sla publicatie over');
    assert(mutations() === 0, 'Publicatie wacht op bevestiging');
    click('Uitvoeren'); await wait();
    assert(mutations() === 1, 'Precies één publicatieactie');
    const call = window.previewCalls.find(call => call.name === 'runAdminPanelPublication');
    assert(call.args[1].gigId === 'demo-1', 'Geladen identiteit doorgeven');
    assert(!document.querySelector('[data-publication]'), 'Selectie wissen na uitvoering');
    window.previewSelectionStatus = 'ERROR'; click('Laad geselecteerde publicatie'); await wait();
    assert([...document.querySelectorAll('[data-publication]')].every(node => node.disabled), 'ERROR mag niet opnieuw worden verwerkt');
    choose('maintenance'); click('Archiveer auditlog'); click('Uitvoeren');
    window.previewFailRead = true; await wait();
    assert(document.getElementById('feedback').textContent.includes('Fictieve actie afgerond.'), 'Actieresultaat behouden bij leesfout');
    assert(document.getElementById('checked').textContent.includes('verouderd'), 'Verouderde informatie markeren');
    choose('help'); assert(document.getElementById('content').textContent.includes('Statuskleuren'), 'Help ontbreekt');
    window.previewFailRead = false; choose('overview'); click('Ververs overzicht'); await wait();
    result.textContent = 'PASS: lokale browsercontroles; alle gegevens zijn fictief.';
    result.dataset.result = 'pass';
  } catch (error) { result.textContent = 'FAIL: ' + error.message + ' | ' + window.previewErrors.join(' | ') + ' | calls: ' + JSON.stringify(window.previewCalls); result.dataset.result = 'fail'; }
  result.style.cssText = 'display:block;margin-top:20px;font:11px Arial;color:#606a68';
  document.body.append(result);
})();
</script>
'@
$html = $html.Replace('</head>', $mock + '</head>').Replace('</body>', $checks + '</body>')
$previewPath = Join-Path $target 'index.html'
[System.IO.File]::WriteAllText($previewPath, $html, [System.Text.UTF8Encoding]::new($false))
Write-Output $previewPath
