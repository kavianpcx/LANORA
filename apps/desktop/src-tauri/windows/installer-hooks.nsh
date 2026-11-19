!include "Win\RestartManager.nsh"

; When the updater test opts in, write only fixed status markers to a fixed temp file.
; Normal production launches do not set this variable and create no diagnostic file.
!macro LANORA_UPDATER_E2E_LOG message
  ReadEnvStr $R6 "LANORA_UPDATER_HOOK_E2E_LOG"
  ${If} $R6 != ""
    FileOpen $R5 "$TEMP\LANORA-updater-e2e-hook.log" a
    ${If} $R5 != error
      FileWrite $R5 "${message}$\r$\n"
      FileClose $R5
    ${EndIf}
  ${EndIf}
!macroend

; NSIS 3.13 Restart Manager checks can race the updater process exit.
; In update mode, wait briefly until no process has the installed executable open.
; Manual installs keep Tauri normal running-app handling.
!macro NSIS_HOOK_PREINSTALL
  ${If} $UpdateMode = 1
    Push $0
    Push $1
    Push $2
    Push $3
    Push $R5
    Push $R6
    Push $R8
    Push $R9
    !insertmacro LANORA_UPDATER_E2E_LOG "hook_enter"
    StrCpy $R8 0
    !insertmacro RestartManager_StartSession $R9
    !insertmacro LANORA_UPDATER_E2E_LOG "session_start_returned"
    ${If} $R9 != ""
      !insertmacro RestartManager_RegisterFile $R9 "$INSTDIR\${MAINBINARYNAME}.exe"
      !insertmacro LANORA_UPDATER_E2E_LOG "resource_register_returned_$0"
      ${If} $0 == 0
        lanora_wait_for_update_file_release:
          StrCpy $1 0
          StrCpy $2 0
          StrCpy $3 0
          System::Call 'RSTRTMGR::RmGetList(i$R9, *i .r1, *i .r2, p 0, *i .r3) i .r0'
          !insertmacro LANORA_UPDATER_E2E_LOG "rm_get_list_$0_iteration_$R8"
          ${If} $0 == 234
            IntOp $R8 $R8 + 1
            IntCmp $R8 80 lanora_update_file_release_done
            Sleep 250
            Goto lanora_wait_for_update_file_release
          ${EndIf}
        lanora_update_file_release_done:
          !insertmacro LANORA_UPDATER_E2E_LOG "file_release_wait_done"
      ${EndIf}
      !insertmacro RestartManager_EndSession $R9
      !insertmacro LANORA_UPDATER_E2E_LOG "session_end_returned"
    ${Else}
      !insertmacro LANORA_UPDATER_E2E_LOG "session_unavailable"
    ${EndIf}
    !insertmacro LANORA_UPDATER_E2E_LOG "hook_exit"
    Pop $R9
    Pop $R8
    Pop $R6
    Pop $R5
    Pop $3
    Pop $2
    Pop $1
    Pop $0
  ${EndIf}
!macroend
