$content = Get-Content 'd:\Downloads\Projects\Projects\speed-script-academy\src\pages\AdminDashboard.jsx'
$trimmed = $content[0..1739]
$ending = @(
    '                   </div>',
    '',
    '                   <div class="grid grid-cols-1 gap-4 pt-4">',
    '                      <button onClick={handleResetPasswordFinal} className="clay-button clay-button-warning h-16 text-xs font-black uppercase tracking-widest">',
    '                        COMMIT NEW CIPHER',
    '                      </button>',
    '                      <button onClick={() => setSelectedUserForPasswordReset(null)} className="clay-button h-14 text-[10px] font-black uppercase tracking-widest bg-clay-canvas text-clay-muted">',
    '                        ABORT PROCESS',
    '                      </button>',
    '                   </div>',
    '                </div>',
    '             </div>',
    '          </div>',
    '       )}',
    '    </div>',
    '  </div>',
    ');',
    '}'
)
$result = $trimmed + $ending
$result | Set-Content 'd:\Downloads\Projects\Projects\speed-script-academy\src\pages\AdminDashboard.jsx' -Force
