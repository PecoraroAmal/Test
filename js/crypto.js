const VERSION={CURRENT:3,V2:2,V1:1};
const SALT=32,IV=12;
let mod=null,ready=false;

const b64uEncode=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64uDecode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd((s.length+3)&~3,'=')),c=>c.charCodeAt(0));

const path=(()=>{
    const s=document.currentScript||document.querySelector('script[src*="crypto.js"]');
    return s?s.src.substring(0,s.src.lastIndexOf('/')+1):'/js/';
})();

const load=()=>new Promise((ok,err)=>{
    const s=document.createElement('script');
    s.src=path+'argon2.js';
    s.onload=()=>{
        if(!window.loadArgon2Module)return err('loadArgon2Module missing');
        loadArgon2Module({wasmUrl:path+'argon2.wasm'}).then(m=>{
            mod=m;ready=true;ok();
        }).catch(err);
    };
    s.onerror=()=>err('argon2.js not found');
    document.head.appendChild(s);
});

const p=load();

async function kdf(pass,salt){
    await p;
    const r=await mod.hash({pass:new TextEncoder().encode(pass),salt,time:3,mem:65536,parallelism:4,hashLen:32,type:2});
    const h=r.hash instanceof ArrayBuffer?new Uint8Array(r.hash):r.hash;
    return crypto.subtle.importKey('raw',h,'AES-GCM',false,['encrypt','decrypt']);
}

async function pbkdf(pass,salt,it,hash){
    const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash},{name:'AES-GCM',length:256},m,false,['encrypt','decrypt']);
}

window.encryptData=async(data,pass)=>{
    if(!pass)throw'Password required';
    await p;
    const salt=crypto.getRandomValues(new Uint8Array(SALT));
    const iv=crypto.getRandomValues(new Uint8Array(IV));
    const key=await kdf(pass,salt);
    const enc=new TextEncoder().encode(JSON.stringify(data));
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc);
    const out=new Uint8Array(1+SALT+IV+ct.byteLength);
    out.set([VERSION.CURRENT]);out.set(salt,1);out.set(iv,1+SALT);out.set(new Uint8Array(ct),1+SALT+IV);
    return b64uEncode(out);
};

window.decryptData=async(b64,pass)=>{
    if(!pass)throw'Password required';
    const data=b64uDecode(b64);
    if(data.length<1+SALT+IV+16)throw'Corrupted';
    const v=data[0];
    let salt,iv,ct,key;
    if(v===3||v===2){
        salt=data.slice(1,1+SALT);
        iv=data.slice(1+SALT,1+SALT+IV);
        ct=data.slice(1+SALT+IV);
        key=v===3?await kdf(pass,salt):await pbkdf(pass,salt,800000,'SHA-512');
    }else{
        if(data.length<16+12+16)throw'V1 invalid';
        salt=data.slice(0,16);
        iv=data.slice(16,28);
        ct=data.slice(28);
        key=await pbkdf(pass,salt,1000000,'SHA-256');
    }
    try{
        const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
        return JSON.parse(new TextDecoder().decode(dec));
    }catch(e){
        throw'Wrong password';
    }
};

window.whenCryptoReady=()=>p;
window.isCryptoReady=()=>ready;