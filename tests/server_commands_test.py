"""Command-contract tests with a Docker stub; not a deployment test."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

class Commands(unittest.TestCase):
    def test_safe_commands_and_secret_redaction(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'scripts').mkdir();(root/'bin').mkdir()
            shutil.copy('scripts/server.sh',root/'scripts/server.sh')
            (root/'.env').write_text('LANORA_PUBLIC_HOST=games.example.org\nLANORA_ADMIN_TOKEN=DO_NOT_PRINT_ADMIN\nLANORA_RELAY_SECRET=DO_NOT_PRINT_RELAY\n')
            stub=root/'bin/docker'
            stub.write_text('''#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALLS"
case "$*" in
 'compose ps -a -q '*) echo fake-container;;
 'inspect --format {{.State.Status}} '*) echo running;;
 'inspect '*) echo 'running; health=healthy';;
esac
''');stub.chmod(0o755)
            env={**os.environ,'PATH':str(root/'bin')+':'+os.environ['PATH'],'CALLS':str(root/'calls')}
            for command in ['status','logs','stop','restart','start']:
                result=subprocess.run(['bash',str(root/'scripts/server.sh'),command],env=env,capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr+result.stdout)
                self.assertNotIn('DO_NOT_PRINT',result.stdout+result.stderr)
            calls=(root/'calls').read_text()
            self.assertNotIn('down',calls);self.assertNotIn('--volumes',calls)
            self.assertIn('compose logs --tail=100 api',calls)
            (root/'.env').unlink()
            result=subprocess.run(['bash',str(root/'scripts/server.sh'),'status'],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,1);self.assertIn('setup-server.sh',result.stdout)

if __name__=='__main__':unittest.main()
