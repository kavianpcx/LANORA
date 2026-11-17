"""Command-contract tests with a Docker stub; not a deployment test."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class Commands(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        (self.root / 'bin').mkdir()
        shutil.copy('scripts/server.sh', self.root / 'scripts/server.sh')
        self.setup_counter = 0
        (self.root / '.env').write_text(
            'LANORA_PUBLIC_HOST=games.example.org\n'
            'LANORA_ADMIN_TOKEN=DO_NOT_PRINT_ADMIN\n'
            'LANORA_RELAY_SECRET=DO_NOT_PRINT_RELAY\n'
            'LANORA_SHARED_NETWORK_CODE=DO_NOT_PRINT_LEGACY_CODE\n'
            'KEEP_THIS_SETTING=preserved\n'
        )
        stub = self.root / 'bin/docker'
        stub.write_text('''#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALLS"
case "$*" in
 'compose version') [[ "${FAIL_AT:-}" != compose ]]; exit $?;;
 'info') [[ "${FAIL_AT:-}" != daemon ]]; exit $?;;
 'compose config --quiet') [[ "${FAIL_AT:-}" != config ]]; exit $?;;
 'compose exec -T caddy wget '*) [[ "${FAIL_AT:-}" != health ]]; exit $?;;
 'compose exec -T api /lanora-api player-auth status')
   echo "${PLAYER_POLICY:-Player password: required}"
   [[ "${FAIL_AT:-}" != policy ]]
   exit $?;;
 'compose exec -T api /lanora-api player-auth set')
   [[ "${FAIL_AT:-}" != policy ]] || exit 1
   echo 'Player password policy updated. Existing player sessions were revoked.';;
 'compose exec -T api /lanora-api player-auth disable')
   [[ "${FAIL_AT:-}" != policy ]] || exit 1
   echo 'Player password policy updated. Existing player sessions were revoked.';;
 'compose ps -a -q '*) echo fake-container;;
 'inspect --format {{.State.Status}} '*) echo running;;
 'inspect --format {{if .State.Health}}{{end}} '*) echo healthy;;
 'inspect '*) echo 'running; health=healthy';;
esac
''')
        stub.chmod(0o755)
        self.calls = self.root / 'calls'
        self.env = {
            **os.environ,
            'PATH': str(self.root / 'bin') + ':' + os.environ['PATH'],
            'CALLS': str(self.calls),
        }

    def run_server(self, command, *, env=None, input_text=None):
        return subprocess.run(
            ['bash', str(self.root / 'scripts/server.sh'), *command],
            env=env or self.env,
            input=input_text,
            capture_output=True,
            text=True,
        )

    def assert_no_secrets(self, result):
        output = result.stdout + result.stderr
        for secret in ('DO_NOT_PRINT_ADMIN', 'DO_NOT_PRINT_RELAY', 'DO_NOT_PRINT_LEGACY_CODE'):
            self.assertNotIn(secret, output)

    def setup_server(self, answers, *, existing_env=None):
        self.setup_counter += 1
        root = self.root / f'setup-{self.setup_counter}'
        (root / 'scripts').mkdir(parents=True, exist_ok=True)
        shutil.copy('scripts/setup-server.sh', root / 'scripts/setup-server.sh')
        shutil.copy('scripts/server.sh', root / 'scripts/server.sh')
        shutil.copy('.env.example', root / '.env.example')
        shutil.copy('docker-compose.yml', root / 'docker-compose.yml')
        if existing_env is not None:
            (root / '.env').write_text(existing_env)
        calls = root / 'calls'
        policy = root / 'policy'
        docker = root / 'bin/docker'
        docker.parent.mkdir(parents=True, exist_ok=True)
        docker.write_text('''#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALLS"
case "$*" in
 'compose version'|'info'|'compose config --quiet'|'compose up -d --build'|'compose up -d api'|'compose restart'|'compose stop') exit 0;;
 'compose exec -T caddy wget '*) exit 0;;
 'compose exec -T api /lanora-api player-auth status')
   if [[ -f "$POLICY_FILE" ]]; then cat "$POLICY_FILE"; else echo 'Player password: required'; fi;;
 'compose exec -T api /lanora-api player-auth set')
   echo 'Player password: required' > "$POLICY_FILE"
   echo 'Player password policy updated. Existing player sessions were revoked.';;
 'compose exec -T api /lanora-api player-auth disable')
   echo 'Player password: disabled' > "$POLICY_FILE"
   echo 'Player password policy updated. Existing player sessions were revoked.';;
 'compose ps -a -q '*) echo fake-container;;
 'inspect --format {{.State.Status}} '*) echo running;;
 'inspect --format {{if .State.Health}}{{.State.Health.Status}}{{end}} '*) echo healthy;;
 'inspect '*) echo 'running; health=healthy';;
esac
''')
        docker.chmod(0o755)
        openssl = root / 'bin/openssl'
        openssl.write_text('#!/usr/bin/env bash\nprintf \'%064d\\n\' 1\n')
        openssl.chmod(0o755)
        env = {
            **os.environ,
            'PATH': str(root / 'bin') + ':' + os.environ['PATH'],
            'CALLS': str(calls),
            'POLICY_FILE': str(policy),
        }
        result = subprocess.run(
            ['bash', str(root / 'scripts/setup-server.sh')],
            env=env,
            input=answers,
            capture_output=True,
            text=True,
        )
        return root, result, calls

    def test_safe_commands_and_secret_redaction(self):
        for command in [('status',), ('logs',), ('stop',)]:
            result = self.run_server(command)
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assert_no_secrets(result)

        result = self.run_server(('code',))
        self.assertEqual(result.returncode, 2)
        self.assertIn('cannot be recovered or displayed', result.stderr)
        self.assert_no_secrets(result)

        result = self.run_server(('player-auth', 'status'))
        self.assertEqual(result.returncode, 0)
        self.assertIn('Player password: required', result.stdout)
        self.assert_no_secrets(result)

        result = self.run_server(
            ('player-auth', 'change'),
            input_text='FirstSecret1!Word\nSecondSecret2!Word\nTopSecret123!Word\nTopSecret123!Word\n',
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('passwords do not match', result.stderr)
        self.assertIn('sessions were revoked', result.stdout)
        self.assertNotIn('TopSecret123!Word', result.stdout + result.stderr)

        result = self.run_server(('player-auth', 'disable'))
        self.assertEqual(result.returncode, 0)
        self.assertIn('anyone who can reach this server may join', result.stdout)
        calls = self.calls.read_text()
        self.assertNotIn('TopSecret123!Word', calls)
        self.assertNotIn('down', calls)
        self.assertNotIn('--volumes', calls)
        self.assertIn('compose logs --tail=100 api', calls)

    def test_legacy_code_migration_preserves_other_env_values(self):
        result = self.run_server(('migrate-legacy-player-code',))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        env_text = (self.root / '.env').read_text()
        self.assertNotIn('LANORA_SHARED_NETWORK_CODE=', env_text)
        self.assertIn('KEEP_THIS_SETTING=preserved', env_text)
        self.assertIn('Legacy player access code migrated', env_text)
        self.assertNotIn('DO_NOT_PRINT_LEGACY_CODE', env_text)
        self.assert_no_secrets(result)

        (self.root / '.env').write_text(
            'LANORA_PUBLIC_HOST=games.example.org\n'
            'LANORA_ADMIN_TOKEN=DO_NOT_PRINT_ADMIN\n'
            'LANORA_RELAY_SECRET=DO_NOT_PRINT_RELAY\n'
            'LANORA_SHARED_NETWORK_CODE=DO_NOT_PRINT_LEGACY_CODE\n'
        )
        result = self.run_server(
            ('migrate-legacy-player-code',),
            env={**self.env, 'PLAYER_POLICY': 'Player password: disabled'},
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Removed the unused legacy player code', result.stdout)
        self.assertNotIn('LANORA_SHARED_NETWORK_CODE=', (self.root / '.env').read_text())
        self.assert_no_secrets(result)

    def test_environment_and_service_failures_are_reported(self):
        for failure, message in [
            ('compose', 'Compose plugin'),
            ('daemon', 'Cannot reach Docker'),
            ('config', 'Invalid configuration'),
            ('health', 'Local API: FAILED'),
        ]:
            result = self.run_server(('status',), env={**self.env, 'FAIL_AT': failure})
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertIn(message, result.stdout)
            self.assert_no_secrets(result)

        (self.root / '.env').unlink()
        result = self.run_server(('status',))
        self.assertEqual(result.returncode, 1)
        self.assertIn('setup-server.sh', result.stdout)

    def test_fresh_setup_defaults_to_protected_and_allows_passwordless_choice(self):
        root, result, calls = self.setup_server(
            'games.example.org\n\nStrongPassword9!Word\nStrongPassword9!Word\n'
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('password protection is enabled', result.stdout)
        self.assertIn('player-auth set', calls.read_text())
        self.assertNotIn('StrongPassword9!Word', result.stdout + result.stderr + calls.read_text())
        self.assertEqual((root / '.env').stat().st_mode & 0o777, 0o600)

        root, result, calls = self.setup_server('games.example.org\nn\n')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('anyone who can reach this server may join', result.stdout)
        self.assertIn('password protection is disabled', result.stdout)
        self.assertIn('player-auth disable', calls.read_text())

    def test_existing_setup_preserves_env_and_migrates_old_code_without_prompt(self):
        existing_env = (
            'LANORA_PUBLIC_HOST=games.example.org\n'
            'LANORA_ADMIN_TOKEN=admin-token-not-really-used-1234567890\n'
            'LANORA_RELAY_SECRET=relay-secret-not-really-used-1234567890\n'
            'LANORA_SHARED_NETWORK_CODE=legacy-code-that-must-not-print\n'
            'LANORA_RELAY_PEER_URL=tcp://games.example.org:11010\n'
        )
        root, result, calls = self.setup_server('', existing_env=existing_env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('LANORA_RELAY_PEER_URL=tcp://games.example.org:11010', (root / '.env').read_text())
        self.assertNotIn('LANORA_SHARED_NETWORK_CODE=', (root / '.env').read_text())
        self.assertIn('Migrated the existing player code', result.stdout)
        self.assertNotIn('legacy-code-that-must-not-print', result.stdout + result.stderr)
        calls_text = calls.read_text()
        self.assertNotIn('player-auth set', calls_text)
        self.assertNotIn('player-auth disable', calls_text)


if __name__ == '__main__':
    unittest.main()
