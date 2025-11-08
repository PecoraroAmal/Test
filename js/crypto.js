const VERSION={CURRENT:3,V2:2,V1:1};
const SALT=32,IV=12;
let mod=null,ready=false;

const b64uEncode=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64uDecode=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');const p=s.length%4;if(p)s+='==='.slice(0,4-p);return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};

const path=()=>{
    if(typeof import.meta!=='undefined'&&import.meta.url)return new URL('.',import.meta.url).pathname;
    const s=document.querySelectorAll('script[src]');for(let e of s)if(e.src.includes('crypto.js'))return new URL('.',e.src).pathname;return'/js/';
};

const load=()=>new Promise((ok,err)=>{
    const s=document.createElement('script');s.src=path()+'argon2.js';s.async=true;
    s.onload=()=>{
        if(typeof loadArgon2Module!=='function')return err(new Error('loadArgon2Module missing'));
        loadArgon2Module({wasmUrl:path()+'argon2.wasm'}).then(m=>{mod=m;ready=true;ok(m);}).catch(err);
    };
    s.onerror=()=>err(new Error('Failed to load argon2.js'));
    document.head.appendChild(s);
});

const promise=load();

async function deriveArgon2(pass,salt){
    if(!ready)await promise;
    const enc=new TextEncoder();
    const res=await mod.hash({pass:enc.encode(pass),salt,time:3,mem:65536,parallelism:4,hashLen:32,type:2});
    const hash=res.hash instanceof ArrayBuffer?new Uint8Array(res.hash):res.hash;
    return crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt']);
}

async function derivePBKDF2(pass,salt,it,hash){
    const enc=new TextEncoder();
    const mat=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash},mat,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

async function encryptData(data,pass){
    if(!pass||typeof pass!=='string')throw new Error('Password required');
    try{await promise;}catch(e){throw new Error('Argon2 failed: '+e.message);}
    const salt=crypto.getRandomValues(new Uint8Array(SALT));
    const iv=crypto.getRandomValues(new Uint8Array(IV));
    const key=await deriveArgon2(pass,salt);
    const encoded=new TextEncoder().encode(JSON.stringify(data));
    const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded));
    const res=new Uint8Array(1+SALT+IV+ct.length);
    res.set([VERSION.CURRENT],0);res.set(salt,1);res.set(iv,1+SALT);res.set(ct,1+SALT+IV);
    return b64uEncode(res);
}

async function decryptData(b64,pass){
    if(!pass||typeof pass!=='string')throw new Error('Password required');
    let data;try{data=b64uDecode(b64);}catch(e){throw new Error('Invalid Base64');}
    if(data.length<1+SALT+IV+16)throw new Error('Corrupted data');
    const v=data[0];
    let salt,iv,ct,key;
    if(v===VERSION.CURRENT||v===VERSION.V2){
        salt=data.slice(1,1+SALT);
        iv=data.slice(1+SALT,1+SALT+IV);
        ct=data.slice(1+SALT+IV);
        key=v===VERSION.CURRENT?await deriveArgon2(pass,salt):await derivePBKDF2(pass,salt,800000,'SHA-512');
    }else{
        if(data.length<16+12+16)throw new Error('Invalid V1 format');
        salt=data.slice(0,16);iv=data.slice(16,28);ct=data.slice(28);
        key=await derivePBKDF2(pass,salt,1000000,'SHA-256');
    }
    try{
        const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
        return JSON.parse(new TextDecoder().decode(dec));
    }catch(e){throw new Error('Wrong password or corrupted data');}
}

window.encryptData=encryptData;
window.decryptData=decryptData;
window.isCryptoReady=()=>ready;
window.whenCryptoReady=()=>promise;