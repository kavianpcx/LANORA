; Wait for the current LANORA process to exit before Tauri's NSIS Restart Manager check.
; The updater launches the installer and terminates the app immediately afterwards.
; Manual installs retain Tauri's standard running-app prompt.
!macro NSIS_HOOK_PREINSTALL
  ${If} $UpdateMode = 1
    Push $R8
    Push $R9
    StrCpy $R8 0
    DetailPrint "Checking that LANORA has closed before applying the update..."
    lanora_wait_for_update_exit:
      nsis_tauri_utils::FindProcessCurrentUser "${MAINBINARYNAME}.exe"
      Pop $R9
      ${If} $R9 = 1
        Goto lanora_update_wait_done
      ${EndIf}
      IntOp $R8 $R8 + 1
      IntCmp $R8 80 lanora_update_wait_done
      Sleep 250
      Goto lanora_wait_for_update_exit
    lanora_update_wait_done:
    Pop $R9
    Pop $R8
  ${EndIf}
!macroend