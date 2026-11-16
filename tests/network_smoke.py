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

def request(path, data=None, token=None):
    req = urllib.request.Request('http://127.0.0.1:18080/api/v1'+path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+token} if token else {})})
    with urllib.request.urlopen(req, timeout=3) as response:
        return json.load(response)

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
        launch([api_binary],env={**os.environ,'LANORA_LISTEN_ADDR':'127.0.0.1:18080',
            'LANORA_DB_PATH':str(root/'api.db'),'LANORA_RELAY_PEER_URL':'tcp://192.0.2.1:11010'})
        until(lambda:request('/health'),10)
        host=request('/rooms',{'name':'Network test','username':'Host','maxPlayers':4})
        guest=request('/rooms/join',{'inviteCode':host['inviteCode'],'username':'Guest'})
        configs=[request(f"/rooms/{m['roomId']}/network",token=m['accessToken']) for m in [host,guest]]
        assert configs[0]==configs[1], 'Approved peers received different networks'
        relay=root/'relay.toml'
        relay.write_text('listeners = ["tcp://0.0.0.0:11010"]\nstun_servers = []\nstun_servers_v6 = []\n'
            '[network_identity]\nnetwork_name="lanora-relay-control"\nnetwork_secret="'+secrets.token_hex(32)+'"\n'
            '[flags]\nno_tun=true\nrelay_network_whitelist="lanora-*"\n')
        relay.chmod(0o600)
        launch([core,'--config-file',str(relay),'--disable-env-parsing'])
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
        print('PASS: API created room; approved clients have distinct real adapter IPv4 addresses',flush=True)
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
        receiver_process=launch(['ip','netns','exec',namespaces[0],sys.executable,'-c',receiver,ips[0],str(ready)])
        until(ready.exists,10)
        sender="""
import socket,sys
ip=sys.argv[1];payload=b'LANORA-real-network-test'
with socket.create_connection((ip,24862),timeout=15) as tcp:
 tcp.sendall(payload);assert tcp.recv(1024)==payload
with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as udp:
 udp.settimeout(15);udp.sendto(payload,(ip,24862));assert udp.recvfrom(1024)[0]==payload
"""
        run('ip','netns','exec',namespaces[1],sys.executable,'-c',sender,ips[0])
        assert receiver_process.wait(timeout=10)==0
        print('PASS: real TCP and UDP round trips through a foreign-network relay (P2P disabled)',flush=True)
    finally:
        for process in reversed(processes):
            process.terminate()
        for process in reversed(processes):
            try:process.wait(timeout=5)
            except sp.TimeoutExpired:process.kill();process.wait()
        for ns in namespaces:sp.run(['ip','netns','delete',ns],stdout=sp.DEVNULL,stderr=sp.DEVNULL)
        sp.run(['ip','link','delete',bridge],stdout=sp.DEVNULL,stderr=sp.DEVNULL)
