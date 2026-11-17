"""Linux root-only, real EasyTier + API + TCP/UDP test in isolated namespaces.
This is a local integration test, NOT two independent internet connections.
Usage: sudo python3 tests/network_smoke.py CORE CLI API_BINARY
"""
import ipaddress
import json
import os
from pathlib import Path
import secrets
import subprocess as sp
import sys
import tempfile
import time
from urllib.error import HTTPError
import urllib.request

core, cli, api_binary = [str(Path(p).resolve()) for p in sys.argv[1:]]
processes = []
namespaces = ['ln-test-a', 'ln-test-b']
bridge = 'ln-test-br'

def run(*args):
    return sp.check_output(args, text=True, stderr=sp.DEVNULL)

def launch(args, **kwargs):
    process = sp.Popen(args, stdout=sp.DEVNULL, stderr=sp.DEVNULL, **kwargs)
    processes.append(process)
    return process

def request(path, data=None, token=None, method=None):
    req = urllib.request.Request('http://127.0.0.1:18080/api/v1'+path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+token} if token else {})},
        method=method or ('POST' if data is not None else 'GET'))
    with urllib.request.urlopen(req, timeout=3) as response:
        return json.load(response)

def rejected(path, data=None, token=None):
    req = urllib.request.Request('http://127.0.0.1:18080/api/v1'+path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+token} if token else {})})
    try:
        urllib.request.urlopen(req, timeout=3)
    except HTTPError as error:
        return error.code, json.load(error)
    raise AssertionError('request unexpectedly succeeded: '+path)

def until(check, timeout=60):
    deadline = time.monotonic()+timeout
    while time.monotonic()<deadline:
        try:
            value=check()
            if value: return value
        except (OSError, ValueError, sp.SubprocessError): pass
        time.sleep(1)
    raise RuntimeError('Timed out waiting for network test condition')

with tempfile.TemporaryDirectory(prefix='lanora-test-') as directory:
    root=Path(directory)
    try:
        run('ip','link','add',bridge,'type','bridge')
        run('ip','addr','add','192.0.2.1/24','dev',bridge)
        run('ip','link','set',bridge,'up')
        for index, ns in enumerate(namespaces):
            run('ip','netns','add',ns)
            host=f'ln-veth-{index}'
            run('ip','link','add',host,'type','veth','peer','name','eth0','netns',ns)
            run('ip','link','set',host,'master',bridge);run('ip','link','set',host,'up')
            run('ip','-n',ns,'link','set','lo','up');run('ip','-n',ns,'link','set','eth0','up')
            run('ip','-n',ns,'addr','add',f'192.0.2.{index+2}/24','dev','eth0')
            run('ip','-n',ns,'route','add','default','via','192.0.2.1')
        api_process=launch([api_binary],env={**os.environ,'LANORA_LISTEN_ADDR':'127.0.0.1:18080',
            'LANORA_DB_PATH':str(root/'api.db'),'LANORA_RELAY_PEER_URL':'tcp://192.0.2.1:11010',
            'LANORA_ADMIN_TOKEN':'smoke-test-admin-token'})
        until(lambda:request('/health'),10)
        info=request('/connection-info')
        assert info['playerAuth']=='password_required', 'fresh servers must default to password protection'
        assert not ({'passwordHash','networkSecret','adminToken','accessToken'} & info.keys()), 'connection info exposed a secret'
        status, body=rejected('/network/join',{'deviceId':secrets.token_hex(16),'username':'No Password'})
        assert status==503 and body['error']['code']=='player_auth_unconfigured', 'unconfigured server did not fail closed'
        password='CorrectHorse9!Relay'
        request('/admin/player-auth', {'playerAuth':'password_required','password':password}, 'smoke-test-admin-token','PATCH')
        status, body=rejected('/network/join',{'password':'WrongPassword9!Relay','deviceId':secrets.token_hex(16),'username':'Wrong Password'})
        assert status==401 and body['error']['code']=='network_password_invalid', 'wrong player password was not rejected'
        protected=request('/network/join',{'password':password,'deviceId':secrets.token_hex(16),'username':'Protected Player'})
        assert protected['status']=='approved', 'correct player password was not authorized'
        request('/admin/player-auth', {'playerAuth':'passwordless'}, 'smoke-test-admin-token','PATCH')
        status, _=rejected('/network/config',token=protected['accessToken'])
        assert status==401, 'policy change did not revoke an existing player session'
        assert request('/connection-info')['playerAuth']=='passwordless', 'passwordless policy was not discoverable'
        host_device_id=secrets.token_hex(16)
        guest_device_id=secrets.token_hex(16)
        host=request('/network/join',{'deviceId':host_device_id,'username':'Host','avatar':'cat'})
        guest=request('/network/join',{'deviceId':guest_device_id,'username':'Guest','avatar':'fox'})
        def member_for(response, user_id):
            return next((member for member in response['members'] if member['userId']==user_id), None)
        assert member_for(guest, host['userId'])['avatar']=='cat' and member_for(guest, guest['userId'])['avatar']=='fox', 'players did not receive their selected avatars'
        request('/network/profile', {'username':'Host','avatar':'panda'}, host['accessToken'], 'PATCH')
        profiles=request('/network/heartbeat',{},guest['accessToken'])['members']
        assert next(member for member in profiles if member['userId']==host['userId'])['avatar']=='panda', 'avatar update did not reach the other player'
        request('/network/leave',{},host['accessToken'])
        host=request('/network/join',{'deviceId':host_device_id,'username':'Host'})
        profiles=request('/network/heartbeat',{},guest['accessToken'])['members']
        assert next(member for member in profiles if member['userId']==host['userId'])['avatar']=='panda', 'saved avatar did not persist after reconnect'
        print('PASS: two authorized player profiles synchronize, update live, and persist after reconnect',flush=True)
        configs=[host['network'],guest['network']]
        assert configs[0]==configs[1], 'Authorized players received different shared networks'
        assert request('/network/config',token=host['accessToken'])==configs[0], 'Authorized config did not match join response'
        relay=root/'relay.toml'
        relay.write_text('listeners = ["tcp://0.0.0.0:11010"]\nstun_servers = []\nstun_servers_v6 = []\n'
            '[network_identity]\nnetwork_name="lanora-relay-control"\nnetwork_secret="'+secrets.token_hex(32)+'"\n'
            '[flags]\nno_tun=true\nrelay_network_whitelist="lanora-*"\n')
        relay.chmod(0o600)
        launch([core,'--config-file',str(relay),'--disable-env-parsing'])
        default_routes=[run('ip','-n',ns,'route','show','default') for ns in namespaces]
        for ns,cfg in zip(namespaces,configs):
            path=root/(ns+'.toml')
            path.write_text('instance_name="lanora-room"\ndhcp=true\nrpc_portal="127.0.0.1:15888"\n'
                'listeners=[]\nstun_servers=[]\nstun_servers_v6=[]\nexit_nodes=[]\n'
                '[[peer]]\nuri='+json.dumps(cfg['peerUrl'])+'\n[network_identity]\nnetwork_name='+json.dumps(cfg['networkName'])+
                '\nnetwork_secret='+json.dumps(cfg['networkSecret'])+'\n[flags]\nenable_encryption=true\ndisable_p2p=true\nenable_exit_node=false\n')
            path.chmod(0o600)
            launch(['ip','netns','exec',ns,core,'--config-file',str(path),'--disable-env-parsing'])
        def assigned():
            result=[]
            for ns in namespaces:
                info=json.loads(run('ip','netns','exec',ns,cli,'-n','lanora-room','-o','json','node'))
                address=str(ipaddress.IPv4Interface(info['ipv4_addr']).ip)
                interfaces=json.loads(run('ip','-n',ns,'-j','addr'))
                if not any(a.get('local')==address for i in interfaces for a in i.get('addr_info',[])):return None
                result.append(address)
            return result if len(set(result))==2 else None
        ips=until(assigned)
        assert [run('ip','-n',ns,'route','show','default') for ns in namespaces]==default_routes, 'EasyTier changed a client default route'
        print('PASS: EasyTier left both client default routes unchanged',flush=True)
        for entry, address in zip([host,guest], ips):
            result=request('/network/heartbeat',{'virtualIp':address},entry['accessToken'])
        assert len(result['members']) == 2 and all(m['online'] and m['virtualIp'] for m in result['members']), 'heartbeat presence or virtual IP missing'
        print('PASS: passwordless authorization established two player sessions and reports their assigned virtual IPs',flush=True)
        ready=root/'ready'
        receiver="""
import socket,sys,threading,pathlib
ip,ready=sys.argv[1:]
tcp=socket.socket();tcp.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);tcp.bind((ip,24862));tcp.listen(1);tcp.settimeout(30)
udp=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);udp.bind((ip,24862));udp.settimeout(30)
def receive_udp():
 data,source=udp.recvfrom(1024);udp.sendto(data,source)
thread=threading.Thread(target=receive_udp);thread.start();pathlib.Path(ready).touch()
connection,_=tcp.accept();connection.settimeout(10);data=connection.recv(1024);connection.sendall(data);connection.close();thread.join()
"""
        sender="""
import socket,sys
ip=sys.argv[1];payload=b'LANORA-real-network-test'
with socket.create_connection((ip,24862),timeout=15) as tcp:
 tcp.sendall(payload);assert tcp.recv(1024)==payload
with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as udp:
 udp.settimeout(15);udp.sendto(payload,(ip,24862));assert udp.recvfrom(1024)[0]==payload
"""
        def exchange():
            ready.unlink(missing_ok=True)
            receiver_process=launch(['ip','netns','exec',namespaces[0],sys.executable,'-c',receiver,ips[0],str(ready)])
            until(ready.exists,10)
            run('ip','netns','exec',namespaces[1],sys.executable,'-c',sender,ips[0])
            assert receiver_process.wait(timeout=10)==0
        exchange()
        print('PASS: shared-network TCP and UDP round trips through the relay (P2P disabled)',flush=True)
        api_process.terminate();api_process.wait(timeout=5)
        exchange()
        print('PASS: existing TCP/UDP data plane works while control API is offline',flush=True)
        run('ip','-n',namespaces[1],'link','set','eth0','down')
        time.sleep(3)
        run('ip','-n',namespaces[1],'link','set','eth0','up')
        until(lambda: run('ip','netns','exec',namespaces[1],'ping','-c','1','-W','1',ips[0]))
        exchange()
        print('PASS: TCP/UDP resumed after local underlay link down/up',flush=True)
    finally:
        for process in reversed(processes):
            process.terminate()
        for process in reversed(processes):
            try:process.wait(timeout=5)
            except sp.TimeoutExpired:process.kill();process.wait()
        for ns in namespaces:sp.run(['ip','netns','delete',ns],stdout=sp.DEVNULL,stderr=sp.DEVNULL)
        sp.run(['ip','link','delete',bridge],stdout=sp.DEVNULL,stderr=sp.DEVNULL)
