import test from 'node:test';
import assert from 'node:assert/strict';
import {api, health, normalize, friendlyError} from '../.test-build/api.js';
test('addresses keep HTTPS for public servers and infer HTTP for loopback development',()=>{
 assert.equal(normalize('games.example.org:443'),'https://games.example.org');
 assert.equal(normalize('localhost:8099'),'http://localhost:8099');
 assert.equal(normalize('127.0.0.1:8099'),'http://127.0.0.1:8099');
 assert.equal(normalize('[::1]:8099'),'http://[::1]:8099');
 assert.equal(normalize('http://localhost:8099'),'http://localhost:8099');
 assert.equal(normalize('http://127.0.0.1:8099'),'http://127.0.0.1:8099');
 assert.equal(normalize('http://localhost:8080'),'http://localhost:8080');
 assert.equal(normalize('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
 assert.equal(normalize('http://127.42.0.7:8080'),'http://127.42.0.7:8080');
 assert.equal(normalize('http://[::1]:8080'),'http://[::1]:8080');
 assert.equal(normalize('https://games.example.org:443'),'https://games.example.org');
 assert.throws(()=>normalize(''),e=>e.code==='empty_address');
 assert.throws(()=>normalize('   \t'),e=>e.code==='empty_address');
 assert.throws(()=>normalize('http://example.org'),e=>e.code==='insecure_http');
 assert.throws(()=>normalize('http://192.168.1.2:8080'),e=>e.code==='insecure_http');
 assert.throws(()=>normalize('ftp://games.example.org'),e=>e.code==='unsupported_protocol');
 for(const value of ['not a host', 'https://user:secret@example.org','https://example.org/path','https://example.org?token=secret','file:///tmp','localhost:99999']) assert.throws(()=>normalize(value));
});
test('loopback HTTP health requests declare their target address space',async()=>{
 const original=global.fetch;let captured;
 try {
  global.fetch=async(_url,options)=>{captured=options;return new Response(JSON.stringify({status:'ok',service:'lanora-api'}));};
  await health('http://127.0.0.1:8080');
  assert.equal(captured.targetAddressSpace,'loopback');
  assert.equal(new Headers(captured.headers).has('content-type'),false);
 } finally {global.fetch=original;}
});
test('JSON content type is only sent when a request body exists',async()=>{
 const original=global.fetch;const captured=[];
 try {
  global.fetch=async(_url,options)=>{captured.push(options);return new Response('{}');};
  await api('https://server','/status');
  await api('https://server','/join',undefined,{username:'Player'});
  assert.equal(new Headers(captured[0].headers).has('content-type'),false);
  assert.equal(new Headers(captured[1].headers).get('content-type'),'application/json');
  assert.equal(captured[1].body,'{"username":"Player"}');
 } finally {global.fetch=original;}
});

test('server errors are translated without exposing remote error text',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>new Response(JSON.stringify({error:{code:'invalid_password',message:'SECRET'}}),{status:401});
 await assert.rejects(api('https://server','/join'),e=>e.code==='invalid_password'&&e.status===401&&!friendlyError(e,'en').includes('SECRET'));}
 finally {global.fetch=original;}
});
test('health validates service identity, not just HTTP 200',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>new Response('{"status":"ok","service":"unrelated"}');await assert.rejects(health('https://server'),e=>e.code==='lanora_api_invalid');
 global.fetch=async()=>new Response('{"status":"ok","service":"lanora-api"}');await health('https://server');}finally{global.fetch=original;}
});
test('real request timeout cancels the underlying fetch',async()=>{
 const original=global.fetch;let aborted=false;
 try {global.fetch=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));}));
 await assert.rejects(api('https://server','/health',undefined,undefined,undefined,{timeoutMs:5}),e=>e.code==='timeout');assert.equal(aborted,true);}
 finally {global.fetch=original;}
});
test('network failure and invalid JSON are distinct',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(api('https://server','/'),e=>e.code==='network'&&e.causeName==='TypeError');
 global.fetch=async()=>new Response('<html>');await assert.rejects(api('https://server','/'),e=>e.code==='response');}finally{global.fetch=original;}
});

test('certificate failures are distinguished when the WebView exposes a TLS error',async()=>{
 const original=global.fetch;
 try {
  global.fetch=async()=>{throw new TypeError('net::ERR_CERT_AUTHORITY_INVALID')};
  await assert.rejects(api('https://server','/'),e=>e.code==='tls_certificate'&&friendlyError(e,'en').includes('certificate'));
  global.fetch=async()=>{throw new TypeError('Failed to fetch')};
  await assert.rejects(api('https://server','/'),e=>e.code==='network');
 } finally {global.fetch=original;}
});
