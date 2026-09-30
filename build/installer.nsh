; Refresh the Windows icon cache after install so the new icon appears immediately.
!macro customInstall
  ; Notify Windows Shell that icons have changed.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x0000, p 0, p 0)'

  ; Also call ie4uinit to refresh the icon cache.
  nsExec::ExecToLog 'ie4uinit.exe -show'
!macroend
