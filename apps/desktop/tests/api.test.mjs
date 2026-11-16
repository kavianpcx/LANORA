import test from 'node:test';
import assert from 'node:assert/strict';
import {api, health, normalize, friendlyError} from '../.test-build/api.js';
test('addresses require HTTPS except local loopback and reject embedded credentials or paths',()=>{
 assert.equal(normalize('games.example.org:443'),'https://games.example.org');
 assert.equal(normalize('http://localhost:8080'),'http://localhost:8080');
 assert.equal(normalize('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
 assert.equal(normalize('http://127.42.0.7:8080'),'http://127.42.0.7:8080');
 assert.equal(normalize('http://[::1]:8080'),'http://[::1]:8080');
 for(const value of ['', 'http://example.org','http://192.168.1.2:8080','https://user:secret@example.org','https://example.org/path','https://example.org?token=secret','file:///tmp']) assert.throws(()=>normalize(value));
});
test('server errors are translated without exposing remote error text',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>new Response(JSON.stringify({error:{code:'invalid_password',message:'SECRET'}}),{status:401});
 await assert.rejects(api('https://server','/join'),e=>e.code==='invalid_password'&&e.status===401&&!friendlyError(e,'en').includes('SECRET'));}
 finally {global.fetch=original;}
});
test('health validates service identity, not just HTTP 200',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>new Response('{"status":"ok","service":"unrelated"}');await assert.rejects(health('https://server'),e=>e.code==='response');
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
 try {global.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(api('https://server','/'),e=>e.code==='network');
 global.fetch=async()=>new Response('<html>');await assert.rejects(api('https://server','/'),e=>e.code==='response');}finally{global.fetch=original;}
});
