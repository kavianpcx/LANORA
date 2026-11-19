; Wait briefly for the current LANORA process to release its executable before
; Tauri's NSIS Restart Manager check. Tauri 2.12 starts the installer and exits
; the updater process immediately, so the installer can race that shutdown.
; Manual installs keep the normal Tauri prompt; only in-app updates wait here.
!macro NSIS_HOOK_PREINSTALL
  ${If} $UpdateMode = 1
    Push $R8
    Push $R9
    StrCpy $R8 0
    DetailPrint "Checking that LANORA has closed before applying the update..."
    lanora_wait_for_update_exit:
      IfFileExists "$INSTDIR\\${MAINBINARYNAME}.exe" 0 lanora_update_wait_done
      ClearErrors
      ; An executable image still in use cannot be opened for append.
      FileOpen $R9 "$INSTDIR\\${MAINBINARYNAME}.exe" a
      IfErrors 0 lanora_update_exe_released
      IntOp $R8 $R8 + 1
      IntCmp $R8 80 lanora_update_wait_done
      Sleep 250
      Goto lanora_wait_for_update_exit
    lanora_update_exe_released:
      FileClose $R9
    lanora_update_wait_done:
    Pop $R9
    Pop $R8
  ${EndIf}
!macroend
