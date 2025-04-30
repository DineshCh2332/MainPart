// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

    apiKey: "AIzaSyA5jVQcxmKKLQy31Ft8329EB_cWRyBu0uI",
    authDomain: "bhookiecore.firebaseapp.com",
    databaseURL: "https://bhookiecore-default-rtdb.firebaseio.com",
    projectId: "bhookiecore",
    storageBucket: "bhookiecore.firebasestorage.app",
    messagingSenderId: "252666746613",
    appId: "1:252666746613:web:e97a48d4c31c1d952d17bc",
    measurementId: "G-STVRJ77V79"
  
  };

  
// const firebaseConfig = {
//   apiKey: "AIzaSyCDBLZZBNcmSIWmDCxgi0flVkVLPulfAoQ",
//   authDomain: "first-trail-f286d.firebaseapp.com",
//   projectId: "first-trail-f286d",
//   storageBucket: "first-trail-f286d.firebasestorage.app",
//   messagingSenderId: "199953923693",
//   appId: "1:199953923693:web:36fe1b12e5708f0af68964",
//   measurementId: "G-XZ3QDGKCCR"
// };



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

