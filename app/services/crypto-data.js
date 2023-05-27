import Service from '@ember/service';
import SHA512 from 'crypto-js/sha512';
import CryptoJS from 'crypto-js';
import { inject as service } from '@ember/service';

const SALT = '3!D7+q*ZCg9l1*VKJWVe-eG/cOJ)0Jbc)#pcvSY*cxUa7nLQWbxXnT:h)5egM?F8';

export default class CryptoDataService extends Service {
  @service currentUser;

  encrypt(data, key) {
    if (data && key) {
      let utf8 = CryptoJS.enc.Utf8.parse(data);
      let pass = CryptoJS.enc.Hex.parse(key);
      let encrypted = CryptoJS.AES.encrypt(utf8, pass, {
        iv: CryptoJS.enc.Hex.parse(SALT),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      // console.debug('Encrypted: '+encrypted);
      // let encryptedData = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
      // console.debug('Encrypted data: '+encryptedData);
      return encrypted;
    }
    return '';
  }

  decrypt(data, key) {
    if (data && key) {
      let pass = CryptoJS.enc.Hex.parse(key);
      let decrypted = CryptoJS.AES.decrypt(data, pass, {
        iv: CryptoJS.enc.Hex.parse(SALT),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      let decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
      // console.debug('Decrypted UTF8: '+decryptedData);
      return decryptedData;
    }
    return '';
  }

  newKey(username) {
    let newKey = '';
    if (username) {
      let salt = SALT;
      let userHash = SHA512(username).toString();
      newKey = CryptoJS.PBKDF2(userHash, salt, {
        keySize: 512 / 32,
        iterations: 1000,
      }).toString();
    }
    return newKey;
  }
}
