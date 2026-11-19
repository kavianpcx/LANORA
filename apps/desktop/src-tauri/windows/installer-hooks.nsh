!include "Win\RestartManager.nsh"

; NSIS 3.13 Restart Manager checks can race the updater process exit.
; In update mode, wait briefly until no process has the installed executable open.
; Manual installs keep Tauri normal running-app handling.
!macro NSIS_HOOK_PREINSTALL
  ${If} $UpdateMode = 1
    Push $0
    Push $1
    Push $2
    Push $3
    Push $R8
    Push $R9
    StrCpy $R8 0
    !insertmacro RestartManager_StartSession $R9
    ${If} $R9 != ""
      !insertmacro RestartManager_RegisterFile $R9 "$INSTDIR\${MAINBINARYNAME}.exe"
      ${If} $0 == 0
        lanora_wait_for_update_file_release:
          StrCpy $1 0
          StrCpy $2 0
          StrCpy $3 0
          System::Call 'RSTRTMGR::RmGetList(i$R9, *i .r1, *i .r2, p 0, *i .r3) i .r0'
          ${If} $0 == 234
            IntOp $R8 $R8 + 1
            IntCmp $R8 80 lanora_update_file_release_done
            Sleep 250
            Goto lanora_wait_for_update_file_release
          ${EndIf}
        lanora_update_file_release_done:
      ${EndIf}
      !insertmacro RestartManager_EndSession $R9
    ${EndIf}
    Pop $R9
    Pop $R8
    Pop $3
    Pop $2
    Pop $1
    Pop $0
  ${EndIf}
!macroend
