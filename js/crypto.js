const VERSION={CURRENT:3,V2_PBKDF2_SHA512:2,V1_PBKDF2_SHA256:1};
const SALT_LENGTH=32;
const IV_LENGTH=12;
const ARGON2_PARAMS={time:3,mem:65536,parallelism:4,hashLen:32,type:2};

let argon2Module=null;
let argon2Ready=false;

const base64UrlEncode=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const base64UrlDecode=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');const p=s.length%4;if(p)s+='==='.slice(0,4-p);return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};

const getScriptPath=()=>{
    if(typeof import.meta!=='undefined'&&import.meta.url)return new URL('.',import.meta.url).pathname;
    const scripts=document.querySelectorAll('script[src]');
    for(let s of scripts)if(s.src.includes('crypto.js'))return new URL('.',s.src).pathname;
    return'/js/';
};

const loadArgon2=()=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=getScriptPath()+'argon2.js';
    script.async=true;
    script.onload=()=>{
        if(typeof loadArgon2Module!=='function')return reject(new Error('loadArgon2Module missing'));
        loadArgon2Module({wasmUrl:getScriptPath()+'argon2.wasm'}).then(mod=>{
            argon2Module=mod;
            argon2Ready=true;
            resolve(mod);
        }).catch(reject);
    };
    script.onerror=()=>reject(new Error('Failed to load argon2.js'));
    document.head.appendChild(script);
});

const argon2Promise=loadArgon2();

async function deriveKeyArgon2(password,salt){
    if(!argon2Ready)await argon2Promise;
    const enc=new TextEncoder();
    const result=await argon2Module.hash({
        pass:enc.encode(password),
        salt:salt,
        time:ARGON2_PARAMS.time,
        mem:ARGON2_PARAMS.mem,
        parallelism:ARGON2_PARAMS.parallelism,
        hashLen:ARGON2_PARAMS.hashLen,
        type:ARGON2_PARAMS.type
    });
    const hash=result.hash instanceof ArrayBuffer?new Uint8Array(result.hash):result.hash;
    return crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt']);
}

async function deriveKeyPBKDF2(password,salt,iterations,hashName){
    const enc=new TextEncoder();
    const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey(
        {name:'PBKDF2',salt:salt,iterations:iterations,hash:hashName},
        keyMaterial,
        {name:'AES-GCM',length:256},
        false,
        ['encrypt','decrypt']
    );
}

async function encryptData(data,password){
    if(!password||typeof password!=='string')throw new Error('Password required');
    try{await argon2Promise;}catch(e){throw new Error('Argon2 failed: '+e.message);}
    const salt=crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv=crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key=await deriveKeyArgon2(password,salt);
    const encoded=new TextEncoder().encode(JSON.stringify(data));
    const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded));
    const result=new Uint8Array(1+SALT_LENGTH+IV_LENGTH+ciphertext.length);
    result.set([VERSION.CURRENT],0);
    result.set(salt,1);
    result.set(iv,1+SALT_LENGTH);
    result.set(ciphertext,1+SALT_LENGTH+IV_LENGTH);
    return base64UrlEncode(result);
}

async function decryptData(encryptedBase64,password){
    if(!password||typeof password!=='string')throw new Error('Password required');
    let data;
    try{data=base64UrlDecode(encryptedBase64);}catch(e){throw new Error('Invalid Base64');}
    if(data.length<1+SALT_LENGTH+IV_LENGTH+16)throw new Error('Corrupted data');
    const version=data[0];
    let salt,iv,ciphertext,key;
    if(version===VERSION.CURRENT||version===VERSION.V2_PBKDF2_SHA512){
        salt=data.slice(1,1+SALT_LENGTH);
        iv=data.slice(1+SALT_LENGTH,1+SALT_LENGTH+IV_LENGTH);
        ciphertext=data.slice(1+SALT_LENGTH+IV_LENGTH);
        key=version===VERSION.CURRENT
            ?await deriveKeyArgon2(password,salt)
            :await deriveKeyPBKDF2(password,salt,800000,'SHA-512');
    }else{
        if(data.length<16+12+16)throw new Error('Invalid V1 format');
        salt=data.slice(0,16);
        iv=data.slice(16,28);
        ciphertext=data.slice(28);
        key=await deriveKeyPBKDF2(password,salt,1000000,'SHA-256');
    }
    try{
        const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }catch(e){
        throw new Error('Wrong password or corrupted data');
    }
}

window.encryptData=encryptData;
window.decryptData=decryptData;
window.isCryptoReady=()=>argon2Ready;
window.whenCryptoReady=()=>argon2Promise;