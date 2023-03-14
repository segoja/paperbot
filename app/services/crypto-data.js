import Service from '@ember/service';
import SHA512 from 'crypto-js/sha512';
import CryptoJS from 'crypto-js';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import sha3 from 'crypto-js/sha3';

export default class CryptoDataService extends Service { 
  @service currentUser;
   
  salt = 'dcWcd.qVmY&*xc-d--[,Q(%u`Mk )6l?d[|T>w4.-<B(=V.Z1_5+F8~KmMt-O*S+';
   
  encrypt(data, publicKey){
    let encryptedData = '';
    if(!isEmpty(data) && !isEmpty(publicKey)){
      
      let key = CryptoJS.enc.Hex.parse(publicKey);
      let srcs = CryptoJS.enc.Utf8.parse(data);
      let encrypted = CryptoJS.AES.encrypt(srcs, key, {mode: CryptoJS.mode.ECB});
      encryptedData = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
    }
    return encryptedData;
  }
  
  decrypt(data){
    let decryptedData = '';
    let publicKey = CryptoJS.PBKDF2(this.currentUser.userHash, this.salt, { keySize: 512/32 }).toString();
    
    if (!isEmpty(data) && !isEmpty(publicKey)){     
      let key = CryptoJS.enc.Hex.parse(publicKey);
      let decrypted = CryptoJS.AES.decrypt(data, key, {mode: CryptoJS.mode.ECB});
      
      if(decrypted){
        decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
      }
    }
    return decryptedData;    
  }
  
  simpleUuid() {
    let code = ''
    let unixtime, browser, url, randomnr;
    let time = Math.round(new Date().getTime() / 1000);
    let version = window.navigator.appVersion;
    let href = window.location.href;

    unixtime = time.toString(16).substring(0, 8);

    let match = version.match(/\d+/g);
    if (!match) {
      throw 'Invalid browser version string';
    }
    let sum = 0;
    for (let i = 0, ii = match.length; i < ii; ++i) {
      sum += parseInt(match[i], 10);
    }
    browser = (sum * sum * sum).toString(16).substring(0, 6);

    url = (href.length * href.length * href.length).toString(16).substring(0, 4);
    
    randomnr = Math.random().toString().substring(2);
    randomnr = parseInt(randomnr, 10);
    randomnr = randomnr.toString(16).substring(0, 6);

    code = unixtime+'-'+browser+'-'+url+'-'+randomnr;
    return sha3(code, { outputLength: 256 }).toString();
  }
  
}
