// ============================================
//  حروفي - Multi-École avec Admin par École
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqAf5DBg6MudvVcajvWM514OYHp9IGPL8",
    authDomain: "hourouf-app.firebaseapp.com",
    projectId: "hourouf-app",
    storageBucket: "hourouf-app.firebasestorage.app",
    messagingSenderId: "570289093218",
    appId: "1:570289093218:web:8b6cb0ef26ddecbf6baf3b"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const SUPER_ADMIN_PASSWORD = "Hourouf@SuperAdmin2025";

// ✅ PRONONCIATION ARABE
// ✅ speakArabic : utilise les MP3 existants, fallback sur synthèse vocale
window.speakArabic = (text) => {
    if (!text || !text.trim()) return;
    // Chercher la lettre correspondante dans le tableau lettres
    const clean = text.trim().replace(/[ً-ٰٟ]/g, "");
    const found = lettres.find(l => l.l === clean || l.mot === clean || l.mot.startsWith(clean));
    if (found && found.son) {
        // Utiliser le MP3 existant
        const audio = new Audio(found.son);
        audio.play().catch(() => {
            // Fallback synthèse vocale si MP3 échoue
            trySpeechSynthesis(text);
        });
    } else {
        // Pas de MP3 trouvé → synthèse vocale
        trySpeechSynthesis(text);
    }
};

function trySpeechSynthesis(text) {
    try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text.trim());
        utt.lang = "ar-SA";
        utt.rate = 0.75;
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang && v.lang.startsWith("ar"));
        if (arabicVoice) utt.voice = arabicVoice;
        window.speechSynthesis.speak(utt);
    } catch(e) { console.warn("speakArabic error:", e); }
}

// For each letter with 3 forms, we have 3 words showing début/milieu/fin
// formesMots: for each letter, 3 words [début, milieu, fin]
// and formes with correct vowels matching each word
// Couleurs pédagogiques par position
const POS_COLORS = {
    0: { border: "#27ae60", bg: "#eafaf1", label: "أول",  labelFr: "Début",   emoji: "🟢" }, // vert
    1: { border: "#e67e22", bg: "#fef5e7", label: "وسط",  labelFr: "Milieu",  emoji: "🟠" }, // orange
    2: { border: "#8e44ad", bg: "#f5eef8", label: "آخر مربوط", labelFr: "Fin liée", emoji: "🟣" }, // violet
    3: { border: "#2980b9", bg: "#eaf4fb", label: "آخر مطلق", labelFr: "Fin libre", emoji: "🔵" }, // bleu
};

// Correspondance lettre arabe -> nom de fichier PNG (généré par generateur_formes.html)
const LETTER_NOM_MAP = {
    "ب":"ba", "ت":"ta", "ث":"tha", "ج":"jim", "ح":"ha", "خ":"kha",
    "س":"sin", "ش":"shin", "ص":"sad", "ض":"dad", "ط":"ta2", "ع":"ain",
    "غ":"ghain", "ف":"fa", "ق":"qaf", "ك":"kaf", "ل":"lam", "م":"mim",
    "ن":"noun", "هـ":"ha2", "ي":"ya",
    "ا":"alif", "د":"dal", "ذ":"dhal", "ر":"ra", "ز":"za", "و":"waw"
};

const formesMots = {
    // 4 positions : début | médiane | fin liée | fin libre
    // fin liée   = lettre précédente CONNECTANTE (ب ت ث ج ح خ س ش ص ض ط ع غ ف ق ك ل م ن هـ ي)
    // fin libre  = lettre précédente NON-CONNECTANTE (ا د ذ ر ز و)
    "ب": { mots:["بَيْت",    "نَبِيل",   "تَعَب",   "بَاب"],     formes:["بَـ",  "ـبِـ", "ـبْ",  "بْ"]  }, // تَعَب: ع-ب ✅ | باب: ا-ب ✅
    "ت": { mots:["تِين",     "نَتِيج",   "بَيْت",   "تُوت"],     formes:["تِـ",  "ـتِـ", "ـتْ",  "تْ"]  }, // بيت: ي-ت ✅ | توت: و-ت ✅
    "ث": { mots:["ثَوْر",    "مَثِيل",   "لَيْث",   "تُرَاث"]  ,    formes:["ثَـ",  "ـثِـ", "ـثْ",  "ثْ"]  }, // ليث: ي-ث (fin liée) ✅ | وراث: و-ث (fin libre, و non-connectant) ✅
    "ج": { mots:["جَمَل",    "نَجِيب",   "نَهَج",   "تَاج"],     formes:["جَـ",  "ـجِـ", "ـجْ",  "جْ"]  }, // نهج: ه-ج ✅ | تاج: ا-ج ✅
    "ح": { mots:["حِمَار",   "نَحِيف",   "نَجَح",   "رَاح"],     formes:["حِـ",  "ـحِـ", "ـح",   "ح"]   }, // نجح: ج-ح ✅ | راح: ا-ح ✅
    "خ": { mots:["خُبْز",    "نَخِيل",   "نَخْل",   "مُنَاخ"] ,    formes:["خُـ",  "ـخِـ", "ـخ",   "خ"]   }, // مناخ: ا-خ (fin libre, ا non-connectante) ✅
    "س": { mots:["سَمَك",    "نَسِيم",   "شَمْس",   "رَأْس"],    formes:["سَـ",  "ـسِـ", "ـسْ",  "سْ"]  }, // شمس: م-س ✅ | رأس: أ-س ✅
    "ش": { mots:["شَجَر",    "نَشِيط",   "عَيْش",   "فَرَاش"] ,    formes:["شَـ",  "ـشِـ", "ـشْ",  "شْ"]  }, // عيش: ي-ش ✅ | جيش: ي-ش ✅
    "ص": { mots:["صَابُون",  "نَصِيب",   "قَفَص",   "رَصَاص"] ,     formes:["صَـ",  "ـصِـ", "ـصْ",  "صْ"]  }, // قفص: ف-ص ✅ | نص: (ن-ص) ✅
    "ض": { mots:["ضِفْدَع",  "نَضِيج",   "بَعْض",   "فَرْض"],    formes:["ضِـ",  "ـضِـ", "ـضْ",  "ضْ"]  }, // بعض: ع-ض ✅ | فرض: ر-ض ✅
    "ط": { mots:["طَبِيب",   "نَطِيح",   "خَطّ",    "شَرْط"],    formes:["طَـ",  "ـطِـ", "ـطّ",  "طْ"]  }, // خط: خ-ط ✅ | شرط: ر-ط ✅
    "ع": { mots:["عَيْن",    "نَعِيم",   "رَبِيع",  "ذِرَاع"],   formes:["عَـ",  "ـعِـ", "ـعْ",  "عْ"]  }, // ربيع: ي-ع ✅ | ذراع: ا-ع ✅
    "غ": { mots:["غُرْفَة",  "نَغِيم",   "مَبْلَغ", "فَرَاغ"],   formes:["غُـ",  "ـغِـ", "ـغْ",  "غْ"]  }, // مبلغ: ل-غ ✅ | فراغ: ا-غ ✅
    "ف": { mots:["فَرَس",    "نَفِيس",   "صَفّ",    "زَوْف"],    formes:["فَـ",  "ـفِـ", "ـفْ",  "فْ"]  }, // صف: ص-ف ✅ | زوف: و-ف ✅
    "ق": { mots:["قَلَم",    "نَقِيب",   "طَرِيق",  "سَوْق"],    formes:["قَـ",  "ـقِـ", "ـقْ",  "قْ"]  }, // طريق: ي-ق ✅ | سوق: و-ق ✅
    "ك": { mots:["كَلْب",    "نَكِيل",   "سَمَك",   "شَوْك"],    formes:["كَـ",  "ـكِـ", "ـكْ",  "كْ"]  }, // سمك: م-ك ✅ | شوك: و-ك ✅
    "ل": { mots:["لَبَن",    "نَلِيق",   "جَبَل",   "وِصَال"] ,    formes:["لَـ",  "ـلِـ", "ـلْ",  "لْ"]  }, // جبل: ب-ل ✅ | أصل: ص-ل ✅
    "م": { mots:["مَاء",     "نَمِيم",   "قَلَم",   "نَوْم"],    formes:["مَـ",  "ـمِـ", "ـمْ",  "مْ"]  }, // قلم: ل-م ✅ | نوم: و-م ✅
    "ن": { mots:["نَجْمَة",  "مَنِيع",   "سِنّ",    "أَذَان"] ,    formes:["نَـ",  "ـنِـ", "ـنّ",  "نْ"]  }, // سن: س-ن ✅ | زين: ي-ن ✅
    "هـ":{ mots:["هِلَال",   "مَهِيب",   "وَجْه",   "نَزْه"],    formes:["هِـ",  "ـهِـ", "ـهْ",  "هْ"]  }, // وجه: ج-ه ✅ | نزه: ز-ه ✅
    "ي": { mots:["يَمِين",   "نَبِيل",   "كُرْسِي", "وَادِي"],   formes:["يَـ",  "ـيِـ", "ـيْ",  "يْ"]  }, // كرسي: س-ي (fin liée) ✅ | وادي: د-ي (fin libre) ✅
    // Lettres non-connectantes : 2 formes réelles (début libre | fin)
    "ا": { mots:["أَسَد",    "سَاق",     "سَمَا",   "سَمَا"],    formes:["أَ",   "ـا",   "ـا",   "ا"]   },
    "د": { mots:["دُبّ",     "وَلَد",    "وَلَد",   "جَهَاد"],   formes:["دُ",   "ـد",   "ـد",   "دْ"]  },
    "ذ": { mots:["ذِئْب",    "أُذُن",    "أُذُن",   "نَبَذ"],    formes:["ذِ",   "ـذُ",  "ـذُ",  "ذْ"]  },
    "ر": { mots:["رُمَّان",  "شَرَف",    "نَهَر",   "مِحْوَر"] ,    formes:["رُ",   "ـر",   "ـر",   "رْ"]  },
    "ز": { mots:["زَرَافَة", "مِيزَان",  "خَبَز",   "خَبَاز"] ,    formes:["زَ",   "ـز",   "ـز",   "زْ"]  },
    "و": { mots:["وَرْدَة",  "لَوْن",    "دَلْو",   "دَلْو"],    formes:["وَ",   "ـو",   "ـوْ",  "وْ"]  },
};

const lettres = [
    { l:"ا", formes:["أَ","اِ","اُ"],    mot:"أَسَد",    img:"images/lion.jpg",    son:"sons/alif.mp3"  },
    { l:"ب", formes:["بَـ","ـبَـ","ـبَ"], mot:"بَطَّة",  img:"images/duck.png",    son:"sons/ba.mp3"    },
    { l:"ت", formes:["تَـ","ـتَـ","ـتَ"], mot:"تُفَّاحَة",img:"images/appel.png",  son:"sons/ta.mp3"    },
    { l:"ث", formes:["ثَـ","ـثَـ","ـثَ"], mot:"ثَعْلَب", img:"images/renard.jpg",  son:"sons/tha.mp3"   },
    { l:"ج", formes:["جَـ","ـجَـ","ـجَ"], mot:"جَمَل",   img:"images/jamal.png",   son:"sons/jim.mp3"   },
    { l:"ح", formes:["حَـ","ـحَـ","ـحَ"], mot:"حِصَان",  img:"images/hissan.png",  son:"sons/ha.mp3"    },
    { l:"خ", formes:["خَـ","ـخَـ","ـخَ"], mot:"خَرُوف",  img:"images/kharouf.png", son:"sons/kha.mp3"   },
    { l:"د", formes:["دَ","ـدَ"],          mot:"دُبّ",    img:"images/Dob.png",     son:"sons/dal.mp3"   },
    { l:"ذ", formes:["ذَ","ـذَ"],          mot:"ذِئْب",   img:"images/dhib.png",    son:"sons/dhal.mp3"  },
    { l:"ر", formes:["رَ","ـرَ"],          mot:"رُمَّان",  img:"images/roman.png",   son:"sons/ra.mp3"    },
    { l:"ز", formes:["زَ","ـزَ"],          mot:"زَرَافَة", img:"images/zarafa.png",  son:"sons/za.mp3"    },
    { l:"س", formes:["سَـ","ـسَـ","ـسَ"], mot:"سَمَكَة",  img:"images/samaka.png",  son:"sons/sin.mp3"   },
    { l:"ش", formes:["شَـ","ـشَـ","ـشَ"], mot:"شَمْس",   img:"images/shams.png",   son:"sons/shin.mp3"  },
    { l:"ص", formes:["صَـ","ـصَـ","ـصَ"], mot:"صَقْر",   img:"images/saqr.png",    son:"sons/sad.mp3"   },
    { l:"ض", formes:["ضَـ","ـضَـ","ـضَ"], mot:"ضِفْدَع", img:"images/dofda3.png",  son:"sons/dad.mp3"   },
    { l:"ط", formes:["طَـ","ـطَـ","ـطَ"], mot:"طَائِرَة", img:"images/ta2ira.png",  son:"sons/ta2.mp3"   },
    { l:"ظ", formes:["ظَـ","ـظَـ","ـظَ"], mot:"ظَرْف",   img:"images/zarf.png",    son:"sons/za2.mp3"   },
    { l:"ع", formes:["عَـ","ـعَـ","ـعَ"], mot:"عِنَب",   img:"images/ainab.png",   son:"sons/ain.mp3"   },
    { l:"غ", formes:["غَـ","ـغَـ","ـغَ"], mot:"غَزَال",  img:"images/ghazal.png",  son:"sons/ghain.mp3" },
    { l:"ف", formes:["فَـ","ـفَـ","ـفَ"], mot:"فِيل",    img:"images/feel.png",    son:"sons/fa.mp3"    },
    { l:"ق", formes:["قَـ","ـقَـ","ـقَ"], mot:"قَلَم",   img:"images/qalam.png",   son:"sons/qaf.mp3"   },
    { l:"ك", formes:["كَـ","ـكَـ","ـكَ"], mot:"كِتَاب",  img:"images/kitab.png",   son:"sons/kaf.mp3"   },
    { l:"ل", formes:["لَـ","ـلَـ","ـلَ"], mot:"لَيْمُون", img:"images/laymoun.png", son:"sons/lam.mp3"   },
    { l:"م", formes:["مَـ","ـمَـ","ـمَ"], mot:"مَوْز",   img:"images/mouz.png",    son:"sons/mim.mp3"   },
    { l:"ن", formes:["نَـ","ـنَـ","ـنَ"], mot:"نَمِر",   img:"images/namir.png",   son:"sons/noun.mp3"  },
    { l:"هـ",formes:["هَـ","ـهَـ","ـهَ"], mot:"هُدْهُد",  img:"images/hodhod.png",  son:"sons/ha2.mp3"   },
    { l:"و", formes:["وَ","ـوَ"],          mot:"وَرْدَة",  img:"images/warda.png",   son:"sons/waw.mp3"   },
    { l:"ي", formes:["يَـ","ـيَـ","ـيَ"], mot:"يَد",     img:"images/yad.png",     son:"sons/ya.mp3"    }
];


// ====== HELPER: Extract student name from ID ======
function extractStudentName(studentId, schoolId, classId) {
    if (!studentId) return "?";
    // Format: schoolId_classId_Firstname Lastname
    const sid = schoolId || "";
    const cid = classId || "";
    if (sid && cid) {
        const prefix = sid + "_" + cid + "_";
        if (studentId.startsWith(prefix)) return studentId.slice(prefix.length);
    }
    // Try to remove school_ and class_ parts
    // ID parts: school_XXXXX_class_XXXXX_Name
    const parts = studentId.split("_");
    // Find where the name starts (after school_XXXXX_class_XXXXX)
    let nameStart = 0;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "school" || parts[i] === "class") {
            nameStart = i + 2; // skip "school"/"class" and their ID
        }
    }
    if (nameStart > 0 && nameStart < parts.length) {
        return parts.slice(nameStart).join(" ");
    }
    return studentId.split("_").slice(2).join(" ");
}

// STATE
let currentUser=null, currentRole=null, currentSchoolId=null, currentClassId=null;
let selectedRole="student";
let isDemoMode=false; // Mode démo 100% local, sans écriture Firebase
let letterIndex=0, isFlipped=false;
let quizMode=null, quizQuestions=[], quizCurrent=0, quizCorrect=0, quizWrong=0;
let traceSelectedLetter=0, isDrawing=false, lastX=0, lastY=0;

// FIREBASE
const getStudentData  = async id    => { if(!id) return {learned:[],quizScores:[],lastActivity:null}; try { const s=await getDoc(doc(db,"eleves",id)); return s.exists()?{learned:[],quizScores:[],lastActivity:null,...s.data()}:{learned:[],quizScores:[],lastActivity:null}; } catch(e) { return {learned:[],quizScores:[],lastActivity:null}; } };

// ===== PROGRESSION CORAN (utilisé par les tableaux de bord prof/directeur/super-admin) =====
function totalQuranAyahs(){ return (typeof SURAHS !== "undefined" && SURAHS.length) ? SURAHS.reduce((a,s)=>a+s.ayahs,0) : 0; }
function quranMemorizedCount(data){ const qm=data?.quranMemorized||{}; return Object.values(qm).reduce((a,arr)=>a+(arr?.length||0),0); }
function quranPct(data){ const total=totalQuranAyahs(); return total>0 ? Math.round(quranMemorizedCount(data)/total*100) : 0; }
const saveStudentData = async (id,d)=> setDoc(doc(db,"eleves",id),d);
const delStudent      = async id    => deleteDoc(doc(db,"eleves",id));
const getSchools      = async ()    => { const s=await getDocs(collection(db,"ecoles")); const r={}; s.forEach(d=>r[d.id]=d.data()); return r; };
const getTeachers     = async ()    => { const s=await getDocs(collection(db,"profs")); const r={}; s.forEach(d=>r[d.id]=d.data()); return r; };
const getAllStudents   = async ()    => { const s=await getDocs(collection(db,"eleves")); const r={}; s.forEach(d=>r[d.id]=d.data()); return r; };

// SCREENS
window.showScreen = id => {
    document.querySelectorAll(".screen").forEach(s=>{s.classList.remove("active");s.classList.add("hidden");});
    document.getElementById(id).classList.remove("hidden");
    document.getElementById(id).classList.add("active");
};

// LOGIN
window.selectRole = (role,btn) => {
    selectedRole=role;
    document.querySelectorAll(".role-card").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
    const formRole = role === "parent" ? "student" : role; // le parent réutilise le même formulaire que l'élève
    ["student","teacher","schooladmin","superadmin"].forEach(r=>document.getElementById("form-"+r).classList.toggle("hidden",r!==formRole));
    const loginBtn = document.getElementById("student-login-btn");
    if (loginBtn && formRole === "student") {
        if (role === "parent") {
            loginBtn.textContent = "👁️ عرض متابعة ابني / Voir le suivi";
            loginBtn.setAttribute("onclick", "loginParent()");
        } else {
            loginBtn.textContent = "ابدأ التعلم ✨";
            loginBtn.setAttribute("onclick", "loginStudent()");
        }
    }
};

window.loadClasses = async () => {
    const sid=document.getElementById("student-school").value;
    const sel=document.getElementById("student-class");
    sel.innerHTML='<option value="">-- اختر القسم --</option>';
    if(!sid) return;
    const school=(await getDoc(doc(db,"ecoles",sid))).data();
    if(school?.classes) Object.entries(school.classes).forEach(([id,cl])=>sel.innerHTML+=`<option value="${id}">${cl.name}</option>`);
};

// ===== TRADUCTION DES NOMS DE FONCTIONNALITÉS (fixée par école à la création) =====
// Affiche : emoji + arabe + " / " + langue choisie (élève), ou emoji + langue choisie (prof/directeur, base FR)
const FEATURE_I18N = {
    // Onglets élève (arabe toujours affiché + langue secondaire)
    "tab-btn-learn":      { emoji:"📖", ar:"تعلّم",  fr:"Apprendre",        nl:"Leren",            en:"Learn",       es:"Aprender" },
    "tab-btn-quiz":       { emoji:"🎯", ar:"اختبار", fr:"Quiz",             nl:"Quiz",             en:"Quiz",        es:"Cuestionario" },
    "tab-btn-trace":      { emoji:"✏️", ar:"أتتبع",  fr:"Tracé",            nl:"Natrekken",        en:"Tracing",     es:"Trazado" },
    "tab-btn-exercises":  { emoji:"📋", ar:"تمارين", fr:"Exercices",        nl:"Oefeningen",       en:"Exercises",   es:"Ejercicios" },
    "tab-btn-vocab":      { emoji:"📖", ar:"مفردات", fr:"Vocabulaire",      nl:"Woordenschat",     en:"Vocabulary",  es:"Vocabulario" },
    "tab-btn-quran":      { emoji:"🕌", ar:"القرآن", fr:"Coran",            nl:"Koran",            en:"Quran",       es:"Corán" },
    // Onglets professeur (arabe + langue choisie, base FR si aucune langue)
    "t-tab-btn-students":    { emoji:"👥", ar:"الطلاب",     fr:"Élèves",           nl:"Leerlingen",       en:"Students",    es:"Alumnos" },
    "t-tab-btn-classlist":   { emoji:"📋", ar:"قائمة الفصل", fr:"Liste de classe",  nl:"Klaslijst",        en:"Class list",  es:"Lista de clase" },
    "t-tab-btn-attendance":  { emoji:"📅", ar:"الحضور",     fr:"Appel",            nl:"Aanwezigheid",     en:"Attendance",  es:"Asistencia" },
    "t-tab-btn-exercises":   { emoji:"✏️", ar:"تمارين",     fr:"Exercices",        nl:"Oefeningen",       en:"Exercises",   es:"Ejercicios" },
    "t-tab-btn-submissions": { emoji:"📬", ar:"الأعمال المُسلَّمة", fr:"Travaux rendus",   nl:"Ingeleverd werk",  en:"Submissions", es:"Trabajos entregados" },
    // Onglets directeur (arabe + langue choisie, base FR si aucune langue)
    "sa-tab-btn-classes":  { emoji:"📚", ar:"الفصول",     fr:"Classes",       nl:"Klassen",       en:"Classes",      es:"Clases" },
    "sa-tab-btn-teachers": { emoji:"👩‍🏫", ar:"المعلمون",   fr:"Professeurs",   nl:"Leerkrachten",  en:"Teachers",     es:"Profesores" },
    "sa-tab-btn-absences": { emoji:"📅", ar:"الغيابات",   fr:"Absences",      nl:"Afwezigheden",  en:"Absences",     es:"Ausencias" },
    "sa-tab-btn-stats":    { emoji:"📊", ar:"الإحصائيات", fr:"Statistiques",  nl:"Statistieken",  en:"Statistics",   es:"Estadísticas" },
    "sa-tab-btn-settings": { emoji:"⚙️", ar:"الإعدادات",  fr:"Paramètres",    nl:"Instellingen",  en:"Settings",     es:"Configuración" },
    // Écran lettre (carte, navigation, actions)
    "btn-back-menu":    { emoji:"", ar:"← رجوع",   fr:"← Menu",    nl:"← Menu",     en:"← Menu",    es:"← Menú" },
    "btn-flip-card":    { emoji:"🔄", ar:"اقلب",     fr:"Retourner", nl:"Omdraaien",  en:"Flip",      es:"Voltear" },
    "btn-play-sound":   { emoji:"🔊", ar:"استمع",    fr:"Écouter",   nl:"Luisteren",  en:"Listen",    es:"Escuchar" },
    "btn-mark-learned": { emoji:"✅", ar:"فهمت!",    fr:"Compris !", nl:"Begrepen!",  en:"Got it!",   es:"¡Entendido!" },
    // Écran Quiz
    "quiz-title":       { emoji:"", ar:"وقت الاختبار!", fr:"C'est l'heure du quiz !", nl:"Tijd voor de quiz!", en:"Quiz time!", es:"¡Hora del cuestionario!" },
    "quiz-subtitle":    { emoji:"", ar:"هل أنت مستعد؟", fr:"Es-tu prêt ?", nl:"Ben je klaar?", en:"Are you ready?", es:"¿Estás listo?" },
    "quiz-mode-image":  { emoji:"", ar:"ما هذه الصورة؟", fr:"Quelle est cette image ?", nl:"Wat is deze afbeelding?", en:"What is this picture?", es:"¿Qué es esta imagen?" },
    "quiz-mode-letter": { emoji:"", ar:"ما هذا الحرف؟", fr:"Quelle est cette lettre ?", nl:"Welke letter is dit?", en:"What is this letter?", es:"¿Qué letra es esta?" },
    "quiz-mode-word":   { emoji:"", ar:"ما هذه الكلمة؟", fr:"Quel est ce mot ?", nl:"Wat is dit woord?", en:"What is this word?", es:"¿Qué palabra es esta?" },
    "btn-quiz-reset":      { emoji:"🔄", ar:"إعادة", fr:"Recommencer", nl:"Opnieuw", en:"Retry", es:"Reintentar" },
    "btn-quiz-gotolearn":  { emoji:"📖", ar:"تعلّم", fr:"Apprendre", nl:"Leren", en:"Learn", es:"Aprender" },
    // Écran Vocabulaire (filtres)
    "vocab-filter-all":     { emoji:"🌟", ar:"الكل",     fr:"Tout",    nl:"Alles",   en:"All",    es:"Todo" },
    "vocab-filter-letters": { emoji:"🔤", ar:"الحروف",   fr:"Lettres", nl:"Letters", en:"Letters",es:"Letras" },
    "vocab-filter-family":  { emoji:"👨‍👩‍👧", ar:"العائلة", fr:"Famille", nl:"Familie", en:"Family", es:"Familia" },
    "vocab-filter-colors":  { emoji:"🎨", ar:"الألوان",  fr:"Couleurs",nl:"Kleuren", en:"Colors", es:"Colores" },
    "vocab-filter-body":    { emoji:"🧍", ar:"الجسم",    fr:"Corps",   nl:"Lichaam", en:"Body",   es:"Cuerpo" },
    "vocab-filter-house":   { emoji:"🏠", ar:"المنزل",   fr:"Maison",  nl:"Huis",    en:"House",  es:"Casa" },
    // Écran Coran
    "quran-back-btn":  { emoji:"", ar:"← رجوع", fr:"← Retour", nl:"← Terug", en:"← Back", es:"← Volver" },
    "qmode-listen":    { emoji:"🎧", ar:"استمع", fr:"Écouter",   nl:"Luisteren", en:"Listen",   es:"Escuchar" },
    "qmode-read":      { emoji:"📖", ar:"اقرأ",  fr:"Lire",      nl:"Lezen",     en:"Read",     es:"Leer" },
    "qmode-memorize":  { emoji:"🧠", ar:"احفظ",  fr:"Mémoriser", nl:"Onthouden", en:"Memorize", es:"Memorizar" },
    "qmode-quiz":      { emoji:"✅", ar:"اختبر", fr:"Tester",    nl:"Testen",    en:"Test",     es:"Probar" },
    // Écran Tracé
    "trace-title":       { emoji:"✏️", ar:"تتبّع الحرف", fr:"Tracer la lettre", nl:"Letter natrekken", en:"Trace the letter", es:"Trazar la letra" },
    "trace-color-label": { emoji:"🎨", ar:"اللون", fr:"Couleur",  nl:"Kleur",  en:"Color",  es:"Color" },
    "trace-size-label":  { emoji:"✏️", ar:"الحجم", fr:"Taille",   nl:"Grootte",en:"Size",   es:"Tamaño" },
    "eraser-btn":        { emoji:"🗑️", ar:"ممحاة", fr:"Gomme",    nl:"Gum",    en:"Eraser", es:"Borrador" },
    "btn-clear-all":     { emoji:"🗑️", ar:"كل شيء", fr:"Tout effacer", nl:"Alles wissen", en:"Clear all", es:"Borrar todo" },
    "btn-save-trace":    { emoji:"💾", ar:"احفظ",  fr:"Enregistrer", nl:"Opslaan", en:"Save", es:"Guardar" },
    // Tableau de bord professeur
    "t-chart-title-progress":    { emoji:"📊", ar:"التقدّم",           fr:"Progression",        nl:"Voortgang",        en:"Progress",        es:"Progreso" },
    "t-chart-title-donut":       { emoji:"🍩", ar:"حالة الفصل",        fr:"État de la classe",  nl:"Status van de klas",en:"Class status",    es:"Estado de la clase" },
    "t-chart-title-hardletters": { emoji:"🔥", ar:"الحروف الصعبة",     fr:"Lettres difficiles", nl:"Moeilijke letters", en:"Difficult letters", es:"Letras difíciles" },
    "th-t-eleve":       { emoji:"👤", ar:"التلميذ",  fr:"Élève",      nl:"Leerling",  en:"Student",  es:"Alumno" },
    "th-t-progression": { emoji:"📊", ar:"التقدّم",  fr:"Progression",nl:"Voortgang", en:"Progress", es:"Progreso" },
    "th-t-quiz":        { emoji:"🏆", ar:"اختبار",  fr:"Quiz",       nl:"Quiz",      en:"Quiz",     es:"Cuestionario" },
    "th-t-activite":    { emoji:"📅", ar:"النشاط",  fr:"Activité",   nl:"Activiteit",en:"Activity", es:"Actividad" },
    "t-attendance-title": { emoji:"📅", ar:"تسجيل الحضور", fr:"Faire l'appel", nl:"Aanwezigheid noteren", en:"Take attendance", es:"Pasar lista" },
    "btn-load-attendance":{ emoji:"📋", ar:"تحميل", fr:"Charger", nl:"Laden", en:"Load", es:"Cargar" },
    "classlist-title":   { emoji:"📋", ar:"قائمة تلاميذ فصلي", fr:"Liste des élèves de ma classe", nl:"Leerlingenlijst van mijn klas", en:"My class student list", es:"Lista de alumnos de mi clase" },
    "btn-print-classlist":{ emoji:"🖨️", ar:"طباعة", fr:"Imprimer", nl:"Afdrukken", en:"Print", es:"Imprimir" },
    "t-createex-title":  { emoji:"➕", ar:"إنشاء تمرين", fr:"Créer un exercice", nl:"Oefening maken", en:"Create an exercise", es:"Crear un ejercicio" },
    "ex-type-letter":    { emoji:"🔤", ar:"حرف", fr:"Lettre", nl:"Letter", en:"Letter", es:"Letra" },
    "ex-type-word":      { emoji:"📝", ar:"كلمة", fr:"Mot",  nl:"Woord",  en:"Word",   es:"Palabra" },
    "ex-type-forme":     { emoji:"🔀", ar:"أشكال", fr:"Formes", nl:"Vormen", en:"Shapes", es:"Formas" },
    "ex-type-free":      { emoji:"✏️", ar:"حر",   fr:"Libre",  nl:"Vrij",   en:"Free",   es:"Libre" },
    "btn-publish-exercise": { emoji:"📋", ar:"نشر التمرين", fr:"Publier l'exercice", nl:"Oefening publiceren", en:"Publish the exercise", es:"Publicar el ejercicio" },
    // Tableau de bord directeur
    "sa-addclass-title":   { emoji:"➕", ar:"إضافة فصل", fr:"Ajouter une classe", nl:"Klas toevoegen", en:"Add a class", es:"Añadir una clase" },
    "btn-add-class":       { emoji:"", ar:"إضافة 📚", fr:"Ajouter 📚", nl:"Toevoegen 📚", en:"Add 📚", es:"Añadir 📚" },
    "sa-students-title":   { emoji:"👥", ar:"قائمة التلاميذ", fr:"Liste des élèves", nl:"Leerlingenlijst", en:"Student list", es:"Lista de alumnos" },
    "btn-close-stupanel":  { emoji:"✕", ar:"إغلاق", fr:"Fermer", nl:"Sluiten", en:"Close", es:"Cerrar" },
    "btn-add-student":     { emoji:"➕", ar:"إضافة", fr:"Ajouter", nl:"Toevoegen", en:"Add", es:"Añadir" },
    "sa-import-excel-title": { emoji:"📊", ar:"استيراد من Excel", fr:"Importer depuis Excel", nl:"Importeren vanuit Excel", en:"Import from Excel", es:"Importar desde Excel" },
    "btn-import-excel":    { emoji:"📥", ar:"استيراد", fr:"Importer", nl:"Importeren", en:"Import", es:"Importar" },
    "sa-addteacher-title": { emoji:"➕", ar:"إضافة معلم", fr:"Ajouter un professeur", nl:"Leerkracht toevoegen", en:"Add a teacher", es:"Añadir un profesor" },
    "btn-add-teacher":     { emoji:"", ar:"إضافة 👩‍🏫", fr:"Ajouter 👩‍🏫", nl:"Toevoegen 👩‍🏫", en:"Add 👩‍🏫", es:"Añadir 👩‍🏫" },
    "sa-absences-title":   { emoji:"📅", ar:"متابعة الغيابات", fr:"Suivi des absences", nl:"Opvolging afwezigheden", en:"Absence tracking", es:"Seguimiento de ausencias" },
    "btn-export-absences": { emoji:"📥", ar:"تصدير Excel", fr:"Export Excel", nl:"Exporteren naar Excel", en:"Export to Excel", es:"Exportar a Excel" },
    "sa-chart-title-classes": { emoji:"📊", ar:"التقدّم حسب الفصل", fr:"Progression par classe", nl:"Voortgang per klas", en:"Progress by class", es:"Progreso por clase" },
    "sa-chart-title-donut":   { emoji:"🍩", ar:"نظرة عامة على المدرسة", fr:"Vue globale école", nl:"Algemeen schooloverzicht", en:"School overview", es:"Vista general de la escuela" },
    "sa-chart-title-hard":    { emoji:"🔥", ar:"أصعب الحروف", fr:"Lettres les plus difficiles", nl:"Moeilijkste letters", en:"Most difficult letters", es:"Letras más difíciles" },
    "sa-chart-title-quran":   { emoji:"📖", ar:"تقدّم القرآن حسب الفصل", fr:"Progression Coran par classe", nl:"Koran-voortgang per klas", en:"Quran progress by class", es:"Progreso del Corán por clase" },
    "sa-th-eleve":       { emoji:"👤", ar:"التلميذ", fr:"Élève",   nl:"Leerling",  en:"Student",  es:"Alumno" },
    "sa-th-classe":      { emoji:"📚", ar:"الفصل",   fr:"Classe",  nl:"Klas",      en:"Class",    es:"Clase" },
    "sa-th-progression": { emoji:"📊", ar:"التقدّم", fr:"Progression", nl:"Voortgang", en:"Progress", es:"Progreso" },
    "sa-th-quiz":        { emoji:"🏆", ar:"اختبار", fr:"Quiz",    nl:"Quiz",      en:"Quiz",     es:"Cuestionario" },
    "sa-th-activite":    { emoji:"📅", ar:"النشاط", fr:"Activité",nl:"Activiteit",en:"Activity", es:"Actividad" },
    "sa-th-coran":       { emoji:"📖", ar:"القرآن", fr:"Coran",   nl:"Koran",     en:"Quran",    es:"Corán" },
    "sa-settings-logo-title": { emoji:"🎨", ar:"تخصيص المدرسة", fr:"Personnalisation de l'école", nl:"Personalisatie van de school", en:"School customization", es:"Personalización de la escuela" },
    "btn-save-logo":     { emoji:"💾", ar:"حفظ الشعار", fr:"Enregistrer le logo", nl:"Logo opslaan", en:"Save the logo", es:"Guardar el logo" },
    "sa-settings-code-title": { emoji:"🔑", ar:"رمز مدرستك", fr:"Code de votre école", nl:"Code van uw school", en:"Your school code", es:"Código de su escuela" },
};

// Langue secondaire actuellement active (mémorisée pour être réutilisée par d'autres fonctions,
// ex: le compteur de progression généré dynamiquement en JS).
let currentUILang = "";

// Traductions des textes générés dynamiquement en JS (pas de simple libellé de bouton statique)
const DYNAMIC_I18N = {
    lettresApprises: { fr:"lettres apprises", nl:"geleerde letters", en:"letters learned", es:"letras aprendidas" },
    noExercises:      { fr:"Aucun exercice pour l'instant", nl:"Momenteel geen oefeningen", en:"No exercises right now", es:"No hay ejercicios por ahora" },
    noExercisesSub:   { fr:"Les exercices du professeur apparaîtront ici", nl:"De oefeningen van de leerkracht verschijnen hier", en:"The teacher's exercises will appear here", es:"Los ejercicios del profesor aparecerán aquí" },
    typeLetter:       { fr:"Écris la lettre",  nl:"Schrijf de letter", en:"Write the letter", es:"Escribe la letra" },
    typeWord:         { fr:"Écris le mot",     nl:"Schrijf het woord", en:"Write the word",   es:"Escribe la palabra" },
    typeForme:        { fr:"Les formes",       nl:"Vormen",            en:"Shapes",           es:"Formas" },
    typeInstruction:  { fr:"Consigne",         nl:"Instructie",        en:"Instruction",      es:"Instrucción" },
    statusSent:       { fr:"Envoyé",           nl:"Verzonden",         en:"Sent",             es:"Enviado" },
    statusPending:    { fr:"En attente",       nl:"In afwachting",     en:"Pending",          es:"Pendiente" },
    btnStartExercise: { fr:"Commencer l'exercice", nl:"Oefening starten", en:"Start the exercise", es:"Empezar el ejercicio" },
    sentToTeacher:    { fr:"Envoyé au professeur",  nl:"Verzonden naar de leerkracht", en:"Sent to the teacher", es:"Enviado al profesor" },
    whiteBg:          { fr:"Fond blanc",       nl:"Witte achtergrond",  en:"White background", es:"Fondo blanco" },
    notebookLines:    { fr:"Lignes de cahier", nl:"Schriftlijnen",      en:"Notebook lines",   es:"Líneas de cuaderno" },
    prevAyah:         { fr:"Précédent", nl:"Vorige",   en:"Previous", es:"Anterior" },
    nextAyah:         { fr:"Suivant",   nl:"Volgende", en:"Next",     es:"Siguiente" },
    listenFullSurah:  { fr:"Écouter la sourate complète", nl:"Luister naar de volledige soera", en:"Listen to the whole surah", es:"Escuchar la sura completa" },
    readingInProgress:{ fr:"Lecture en cours...", nl:"Bezig met lezen...", en:"Reading...", es:"Leyendo..." },
};

// Petit helper pour les textes bilingues générés dynamiquement en JS (hors boutons/onglets statiques).
// Retourne "arabe / traduction" si une langue est choisie pour l'école, sinon juste l'arabe.
function bi(arText, key) {
    const t = DYNAMIC_I18N[key];
    return (currentUILang && t && t[currentUILang]) ? `${arText} / ${t[currentUILang]}` : arText;
}

// Applique la langue secondaire figée de l'école (uiLang: "" | "fr" | "nl" | "en" | "es") aux noms de fonctionnalités.
// L'arabe reste TOUJOURS affiché (élève, professeur, directeur) ; la langue choisie s'ajoute à côté.
function applyFeatureTranslations(uiLang) {
    currentUILang = uiLang || "";
    Object.entries(FEATURE_I18N).forEach(([id, data]) => {
        const el = document.getElementById(id);
        const labelSpan = el ? el.querySelector(".tab-label") : null;
        if (!labelSpan) return;
        const prefix = data.emoji ? data.emoji + " " : "";
        labelSpan.textContent = uiLang && data[uiLang]
            ? `${prefix}${data.ar} / ${data[uiLang]}`
            : `${prefix}${data.ar}`;
    });
}


function applySchoolBranding(school) {
    const url = school?.logoUrl?.trim();
    // En-tête élève : remplace l'emoji 🌙 par le logo si défini
    const stuImg = document.getElementById("header-logo-img");
    const stuEmoji = document.getElementById("header-logo-emoji");
    if (stuImg && stuEmoji) {
        if (url) { stuImg.src = url; stuImg.classList.remove("hidden"); stuEmoji.classList.add("hidden"); }
        else { stuImg.classList.add("hidden"); stuEmoji.classList.remove("hidden"); }
    }
    // En-tête professeur
    const teachImg = document.getElementById("teacher-logo-img");
    if (teachImg) { if (url) { teachImg.src = url; teachImg.classList.remove("hidden"); } else teachImg.classList.add("hidden"); }
    // En-tête directeur
    const saImg = document.getElementById("sa-logo-img");
    if (saImg) { if (url) { saImg.src = url; saImg.classList.remove("hidden"); } else saImg.classList.add("hidden"); }
}

window.saPreviewLogo = () => {
    const url = document.getElementById("sa-logo-url").value.trim();
    const preview = document.getElementById("sa-logo-preview");
    const placeholder = document.getElementById("sa-logo-placeholder");
    if (url) {
        preview.src = url;
        preview.style.display = "inline-block";
        placeholder.style.display = "none";
        preview.onerror = () => { preview.style.display = "none"; placeholder.style.display = "flex"; };
    } else {
        preview.style.display = "none";
        placeholder.style.display = "flex";
    }
};

window.saSaveLogo = async () => {
    if (isDemoMode) { alert("🎬 Mode démo : modification désactivée."); return; }
    const url = document.getElementById("sa-logo-url").value.trim();
    try {
        await setDoc(doc(db, "ecoles", currentSchoolId), { logoUrl: url }, { merge: true });
        applySchoolBranding({ logoUrl: url });
        alert("✅ Logo enregistré ! Il apparaîtra pour vos élèves et professeurs dès leur prochaine connexion.");
    } catch (e) {
        alert("❌ Erreur lors de l'enregistrement. Vérifiez le lien et réessayez.");
    }
};

// ✅ Résout le code d'école saisi par l'élève en schoolId réel, sans jamais exposer
// la liste des autres écoles (contrairement à l'ancienne liste déroulante).
window.resolveSchoolCode = async () => {
    const codeInput = document.getElementById("student-school-code");
    const resultEl = document.getElementById("school-code-result");
    const hiddenSid = document.getElementById("student-school");
    const code = codeInput.value.trim().toUpperCase();
    hiddenSid.value = "";
    resultEl.style.display = "none";
    document.getElementById("student-class").innerHTML = '<option value="">-- اختر القسم --</option>';
    if (!code) return;

    const schools = await getSchools();
    const entry = Object.entries(schools).find(([, s]) => (s.code || "").toUpperCase() === code);

    if (!entry) {
        resultEl.textContent = "❌ رمز المدرسة غير صحيح";
        resultEl.style.color = "#e74c3c";
        resultEl.style.display = "block";
        return;
    }

    hiddenSid.value = entry[0];
    resultEl.textContent = `✅ ${entry[1].name} - ${entry[1].city}`;
    resultEl.style.color = "#27ae60";
    resultEl.style.display = "block";
    await window.loadClasses();
    window.resetStudentSelect();
};

async function populateSchoolSelect(selId, placeholder) {
    const schools=await getSchools();
    const sel=document.getElementById(selId);
    if(!sel) return;
    sel.innerHTML=`<option value="">${placeholder}</option>`;
    Object.entries(schools).forEach(([id,s])=>sel.innerHTML+=`<option value="${id}">${s.name} - ${s.city}</option>`);
}

window.loginStudent = async () => {
    const sid=document.getElementById("student-school").value;
    const cid=document.getElementById("student-class").value;
    const code=document.getElementById("student-code").value.trim().toUpperCase();
    const selectedName=document.getElementById("student-name-select").value;
    const personalPin=document.getElementById("student-pin")?.value.trim();
    if(!sid||!cid||!code){showError("الرجاء تعبئة جميع الحقول");return;}
    if(!selectedName){showError("اختر اسمك من القائمة");return;}
    // Verify class code
    const schoolSnap=await getDoc(doc(db,"ecoles",sid));
    const schoolData=schoolSnap.data();
    const classData=schoolData?.classes?.[cid];
    if(!classData){showError("القسم غير موجود");return;}
    if(classData.code!==code){showError("رمز القسم غير صحيح ❌");return;}
    // ✅ Vérifier le code personnel si activé
    const studentId=sid+"_"+cid+"_"+selectedName;
    const studentData=await getStudentData(studentId);
    if(studentData.pin) {
        if(!personalPin){showError("أدخل رمزك الشخصي 🔐");return;}
        if(studentData.pin!==personalPin){showError("الرمز الشخصي غير صحيح ❌");return;}
    }
    currentUser=studentId; currentRole="student"; currentSchoolId=sid; currentClassId=cid;
    document.getElementById("header-name").textContent=selectedName;
    applySchoolBranding(schoolData);
    applyFeatureTranslations(schoolData?.uiLang);
    showScreen("screen-menu");
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t=>t.classList.add("hidden"));
    const learnBtn = document.querySelector('.tab-btn[onclick*="learn"]');
    const learnTab = document.getElementById("tab-learn");
    if(learnBtn) learnBtn.classList.add("active");
    if(learnTab) learnTab.classList.remove("hidden");
    await buildMenu(); await updateProgress();
};

// ✅ Connexion parent : mêmes identifiants que l'élève (code école + classe + nom + PIN),
// mais ouvre une vue en lecture seule au lieu de l'application interactive.
window.loginParent = async () => {
    const sid=document.getElementById("student-school").value;
    const cid=document.getElementById("student-class").value;
    const code=document.getElementById("student-code").value.trim().toUpperCase();
    const selectedName=document.getElementById("student-name-select").value;
    const personalPin=document.getElementById("student-pin")?.value.trim();
    if(!sid||!cid||!code){showError("الرجاء تعبئة جميع الحقول");return;}
    if(!selectedName){showError("اختر اسم ابنك من القائمة");return;}
    const schoolSnap=await getDoc(doc(db,"ecoles",sid));
    const schoolData=schoolSnap.data();
    const classData=schoolData?.classes?.[cid];
    if(!classData){showError("القسم غير موجود");return;}
    if(classData.code!==code){showError("رمز القسم غير صحيح ❌");return;}
    const studentId=sid+"_"+cid+"_"+selectedName;
    const studentData=await getStudentData(studentId);
    // 🔒 Le code personnel est OBLIGATOIRE pour l'accès parent (contrairement à l'élève),
    // afin qu'un tiers ne puisse pas consulter les données d'un autre enfant sans autorisation.
    if(!studentData.pin){showError("لا يوجد رمز شخصي لهذا التلميذ بعد. اطلب من المعلم إنشاءه 🔐");return;}
    if(!personalPin){showError("أدخل الرمز الشخصي لابنك 🔐");return;}
    if(studentData.pin!==personalPin){showError("الرمز الشخصي غير صحيح ❌");return;}
    currentUser=studentId; currentRole="parent"; currentSchoolId=sid; currentClassId=cid;
    document.getElementById("parent-student-name").textContent = selectedName;
    // Logo de l'école dans l'en-tête parent
    const parentImg = document.getElementById("parent-logo-img");
    if (parentImg) { if (schoolData?.logoUrl) { parentImg.src = schoolData.logoUrl; parentImg.classList.remove("hidden"); } else parentImg.classList.add("hidden"); }
    showScreen("screen-parent");
    await loadParentDashboard(studentId, selectedName);
};

// Construit le tableau de bord en lecture seule pour le parent
async function loadParentDashboard(studentId, studentName) {
    const data = await getStudentData(studentId);
    const pct = Math.round((data.learned?.length || 0) / lettres.length * 100);
    const qm = data.quranMemorized || {};
    const totalQuranAyahs = typeof SURAHS !== "undefined" ? SURAHS.reduce((a,s)=>a+s.ayahs,0) : 0;
    const memorizedAyahs = Object.values(qm).reduce((a,arr)=>a+(arr?.length||0),0);
    const quranPct = totalQuranAyahs > 0 ? Math.round(memorizedAyahs / totalQuranAyahs * 100) : 0;
    const sc = data.quizScores || [];
    const avgQuiz = sc.length > 0 ? Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length) : null;
    const lastActivity = data.lastActivity ? new Date(data.lastActivity).toLocaleDateString("fr-FR") : "لا يوجد نشاط بعد";
    const messages = (data.parentMessages || []).slice().sort((a,b)=>b.date.localeCompare(a.date));

    const catInfo = {
        general:     { icon: "📋", label: "عام / Général",         color: "#667eea" },
        absence:     { icon: "📅", label: "غياب / Absence",         color: "#e67e22" },
        conduite:    { icon: "⚠️", label: "سلوك / Comportement",    color: "#e74c3c" },
        felicitation:{ icon: "🌟", label: "تهنئة / Félicitation",   color: "#27ae60" },
    };

    document.getElementById("parent-dashboard-content").innerHTML = `
        <h2 style="text-align:center;color:var(--primary);margin-bottom:20px">👦 ${studentName}</h2>

        <div class="teacher-summary" style="margin-bottom:20px">
            <div class="summary-card"><div class="s-num">${pct}%</div><div class="s-label">🔤 الحروف / Lettres</div></div>
            <div class="summary-card"><div class="s-num">${quranPct}%</div><div class="s-label">📖 القرآن / Coran</div></div>
            <div class="summary-card"><div class="s-num">${avgQuiz !== null ? avgQuiz+"%" : "—"}</div><div class="s-label">🏆 الاختبارات / Quiz (${sc.length})</div></div>
        </div>

        <div class="admin-section" style="margin-bottom:20px">
            <h3 style="margin-bottom:10px">📅 آخر نشاط / Dernière activité</h3>
            <p style="color:#555">${lastActivity}</p>
        </div>

        <div class="admin-section">
            <h3 style="margin-bottom:10px">✉️ رسائل المدرسة / Messages de l'école</h3>
            ${messages.length === 0
                ? `<p style="color:#aaa;text-align:center;padding:20px 0">لا توجد رسائل حالياً<br>Aucun message pour le moment</p>`
                : messages.map(m => {
                    const info = catInfo[m.category] || catInfo.general;
                    return `<div style="border-inline-start:4px solid ${info.color};background:#f9f9fb;border-radius:10px;padding:12px 14px;margin-bottom:10px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                            <span style="font-weight:700;color:${info.color}">${info.icon} ${info.label}</span>
                            <span style="font-size:12px;color:#999">${new Date(m.date).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <p style="color:#333;margin:0">${m.text}</p>
                        ${m.author ? `<p style="font-size:12px;color:#aaa;margin-top:6px">— ${m.author}</p>` : ""}
                    </div>`;
                }).join("")
            }
        </div>
    `;
}

// Load student names when class code is entered
window.loadStudentNames = async () => {
    const sid=document.getElementById("student-school").value;
    const cid=document.getElementById("student-class").value;
    const code=document.getElementById("student-code").value.trim().toUpperCase();
    const sel=document.getElementById("student-name-select");
    const msg=document.getElementById("student-list-msg");

    sel.style.display="none";
    msg.style.display="none";
    sel.innerHTML='<option value="">-- اختر اسمك --</option>';

    if(!sid||!cid||!code||code.length<5) return;

    msg.style.display="block";
    try {
        const schoolSnap=await getDoc(doc(db,"ecoles",sid));
        const schoolData=schoolSnap.data();
        const classData=schoolData?.classes?.[cid];
        if(!classData||classData.code!==code){msg.style.display="none";return;}
        const students=classData.students||[];
        if(students.length===0){
            msg.textContent="⚠️ Aucun élève dans cette classe — contactez votre directeur";
            return;
        }
        students.sort().forEach(name=>{
            sel.innerHTML+=`<option value="${name}">${name}</option>`;
        });
        msg.style.display="none";
        sel.style.display="block";
        sel.onchange = () => showPinFieldIfNeeded(sid, cid, sel.value);
    } catch(e) {
        msg.style.display="none";
    }
};

// ✅ Afficher le champ PIN si l élève en a un (toujours affiché en mode parent, pour forcer la vérification)
window.showPinFieldIfNeeded = async (sid, cid, name) => {
    const pinContainer = document.getElementById("pin-container");
    if (!pinContainer || !name) { if(pinContainer) pinContainer.style.display="none"; return; }
    const studentId = sid + "_" + cid + "_" + name;
    const data = await getStudentData(studentId);
    if (data.pin || selectedRole === "parent") {
        pinContainer.style.display = "block";
        document.getElementById("student-pin").value = "";
    } else {
        pinContainer.style.display = "none";
    }
};

window.loginTeacher = async () => {
    const email=document.getElementById("teacher-email").value.trim().toLowerCase();
    const pwd=document.getElementById("teacher-pwd").value;
    if(!email||!pwd){showError("Remplissez email et mot de passe");return;}
    const snap=await getDoc(doc(db,"profs",email));
    if(!snap.exists()){showError("Compte introuvable");document.getElementById("teacher-first-login").classList.remove("hidden");return;}
    const data=snap.data();
    if(!data.password){showError("Créez votre mot de passe");document.getElementById("teacher-first-login").classList.remove("hidden");return;}
    if(data.password!==btoa(pwd)){showError("Mot de passe incorrect");return;}
    currentUser=email; currentRole="teacher"; currentSchoolId=data.schoolId; currentClassId=data.classId;
    document.getElementById("teacher-header-name").textContent="👩‍🏫 "+data.name;
    const teacherSchool=(await getDoc(doc(db,"ecoles",data.schoolId))).data();
    applySchoolBranding(teacherSchool);
    applyFeatureTranslations(teacherSchool?.uiLang);
    showScreen("screen-teacher"); await loadTeacherDashboard();
};

window.loginSchoolAdmin = async () => {
    const email=document.getElementById("schooladmin-email").value.trim().toLowerCase();
    const pwd=document.getElementById("schooladmin-pwd").value;
    if(!email||!pwd){showError("Remplissez email et mot de passe");return;}
    const snap=await getDoc(doc(db,"school_admins",email));
    if(!snap.exists()){showError("Compte introuvable");return;}
    const data=snap.data();
    if(data.password!==btoa(pwd)){showError("Mot de passe incorrect");return;}
    currentUser=email; currentRole="schooladmin"; currentSchoolId=data.schoolId;
    const school=(await getDoc(doc(db,"ecoles",data.schoolId))).data();
    document.getElementById("schooladmin-title").textContent="🏫 "+school.name;
    applySchoolBranding(school);
    applyFeatureTranslations(school?.uiLang);
    showScreen("screen-schooladmin"); await loadSchoolAdminDashboard();
};

window.loginSuperAdmin = async () => {
    const pwd=document.getElementById("superadmin-pwd").value;
    if(pwd!==SUPER_ADMIN_PASSWORD){showError("Mot de passe incorrect");return;}
    currentRole="superadmin";
    showScreen("screen-superadmin"); await loadSuperAdminDashboard();
};

window.showFirstLogin = ()=>showScreen("screen-first-login");

window.doFirstLogin = async () => {
    const email=document.getElementById("fl-email").value.trim().toLowerCase();
    const code=document.getElementById("fl-code").value.trim();
    const pwd1=document.getElementById("fl-pwd1").value;
    const pwd2=document.getElementById("fl-pwd2").value;
    const err=document.getElementById("fl-error");
    err.classList.add("hidden");
    if(!email||!code||!pwd1||!pwd2){err.textContent="Tous les champs sont requis";err.classList.remove("hidden");return;}
    if(pwd1!==pwd2){err.textContent="Mots de passe différents";err.classList.remove("hidden");return;}
    if(pwd1.length<6){err.textContent="6 caractères minimum";err.classList.remove("hidden");return;}
    const snap=await getDoc(doc(db,"profs",email));
    if(!snap.exists()){err.textContent="Email non trouvé";err.classList.remove("hidden");return;}
    const data=snap.data();
    if(data.activationCode!==code){err.textContent="Code d'activation incorrect";err.classList.remove("hidden");return;}
    await setDoc(doc(db,"profs",email),{...data,password:btoa(pwd1)});
    alert("✅ Compte activé ! Connectez-vous maintenant.");
    showScreen("screen-login");
};

function showError(msg){
    const el=document.getElementById("login-error");
    el.textContent="❌ "+msg; el.classList.remove("hidden");
    setTimeout(()=>el.classList.add("hidden"),3000);
}

window.logout = ()=>{
    // Arrêter toute synthèse vocale en cours
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    currentUser=null;currentRole=null;currentSchoolId=null;currentClassId=null;selectedRole="student";isDemoMode=false;
    applyFeatureTranslations(""); // reset : évite qu'une langue d'école reste affichée pour le prochain utilisateur
    ["student-code","teacher-email","teacher-pwd","schooladmin-email","schooladmin-pwd","superadmin-pwd"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    document.querySelectorAll(".role-btn, .role-card").forEach(b=>b.classList.remove("active"));
    const stuBtn = document.querySelector(".role-btn[data-role='student'], .role-card[data-role='student']");
    if(stuBtn) stuBtn.classList.add("active");
    ["teacher","schooladmin","superadmin"].forEach(r=>document.getElementById("form-"+r).classList.add("hidden"));
    document.getElementById("form-student").classList.remove("hidden");
    document.getElementById("teacher-first-login").classList.add("hidden");
    const sel=document.getElementById("student-name-select"); if(sel){sel.style.display="none"; sel.innerHTML='<option value="">-- اختر اسمك --</option>';}
    // ✅ Vider tous les écrans pour éviter que les données du compte précédent restent affichées
    ["teacher-exercises-list","teacher-students-list","submissions-list",
     "school-admin-content","superadmin-content","student-exercises-list",
     "ex-target-container"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
    showScreen("screen-login");
};

// MENU ÉLÈVE
async function buildMenu(){
    if(!currentUser || !currentSchoolId) return;
    const grid=document.getElementById("lettersGrid");
    grid.innerHTML="<div style='text-align:center;padding:40px;color:#aaa'>⏳</div>";
    const data=await getStudentData(currentUser); grid.innerHTML="";
    lettres.forEach((item,i)=>{const div=document.createElement("div");div.className="circle";div.textContent=item.l;if(data.learned.includes(i))div.classList.add("learned");div.onclick=()=>openLetter(i);grid.appendChild(div);});
    if(currentRole==="student") await checkExerciseBadge();
}
async function updateProgress(){
    if(!currentUser) return;
    const data=await getStudentData(currentUser);
    const pct=data.learned.length/lettres.length*100;
    document.getElementById("progress-bar").style.width=pct+"%";
    document.getElementById("compteur").textContent = currentUILang && DYNAMIC_I18N.lettresApprises[currentUILang]
        ? `${data.learned.length} / ${lettres.length} حرف تعلّمته  —  ${data.learned.length} / ${lettres.length} ${DYNAMIC_I18N.lettresApprises[currentUILang]}`
        : data.learned.length+" / "+lettres.length+" حرف تعلّمته";
    if(pct===100) setTimeout(showBravoBadge,500);
}
window.showMenu=async()=>{showScreen("screen-menu");await buildMenu();await updateProgress();};
window.switchTab=(name,btn)=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(t=>t.classList.add("hidden"));
    document.getElementById("tab-"+name).classList.remove("hidden");
    if(name==="trace")initTrace();
};

// LETTRE
async function openLetter(i){letterIndex=i;isFlipped=false;document.getElementById("letter-card-inner").classList.remove("flipped");showScreen("screen-letter");loadLetter();await buildDots();}
function loadLetter(){
    const item=lettres[letterIndex];
    document.getElementById("lettre").textContent=item.l;
    document.getElementById("mot").textContent=item.mot;
    document.getElementById("image").src=item.img;
    document.getElementById("audio").src=item.son;
    const fe=document.getElementById("letter-forms");fe.innerHTML="";
    item.formes.forEach(f=>{const b=document.createElement("span");b.className="letter-form-badge";b.textContent=f;fe.appendChild(b);});
    isFlipped=false;document.getElementById("letter-card-inner").classList.remove("flipped");
    setTimeout(()=>document.getElementById("audio").play().catch(()=>{}),300);buildDots();
}
async function buildDots(){
    const el=document.getElementById("letter-dots");el.innerHTML="";
    const data=await getStudentData(currentUser);
    const start=Math.max(0,Math.min(letterIndex-3,lettres.length-7));
    for(let i=start;i<Math.min(start+7,lettres.length);i++){const d=document.createElement("div");d.className="letter-dot";if(data.learned.includes(i))d.classList.add("done");if(i===letterIndex)d.classList.add("active");el.appendChild(d);}
}
window.flipCard=()=>{isFlipped=!isFlipped;document.getElementById("letter-card-inner").classList.toggle("flipped",isFlipped);};
window.nextLetter=()=>{letterIndex=(letterIndex+1)%lettres.length;loadLetter();};
window.prevLetter=()=>{letterIndex=(letterIndex-1+lettres.length)%lettres.length;loadLetter();};
window.playSound=()=>{const a=document.getElementById("audio");a.currentTime=0;a.play().catch(()=>{});};
const ENCOURAGEMENT_PHRASES = [
    { text: "أحسنت! أنت رائع",                 file: "sons/encouragement/enc_1.mp3" },
    { text: "ممتاز! واصل التقدم",                file: "sons/encouragement/enc_2.mp3" },
    { text: "عمل رائع! أنا فخور بك",             file: "sons/encouragement/enc_3.mp3" },
    { text: "بارك الله فيك، استمر",              file: "sons/encouragement/enc_4.mp3" },
    { text: "أنت نجم متألق!",                   file: "sons/encouragement/enc_5.mp3" },
    { text: "رائع جدًا! خطوة أخرى نحو النجاح",    file: "sons/encouragement/enc_6.mp3" },
];

function showEncouragementToast(text, count) {
    const toast = document.createElement("div");
    toast.textContent = `🎉 ${text} — ${count} حرف!`;
    toast.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:16px 28px;border-radius:16px;font-size:18px;font-weight:bold;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.25);text-align:center;max-width:90vw";
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = "opacity 0.5s";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

window.markLearned=async()=>{
    const data=await getStudentData(currentUser);
    if(!data.learned.includes(letterIndex)){
        data.learned.push(letterIndex);data.lastActivity=new Date().toISOString();data.schoolId=currentSchoolId;data.classId=currentClassId;
        await saveStudentData(currentUser,data);
        // 🎉 Encouragement verbal tous les 5 lettres apprises
        if (data.learned.length % 5 === 0) {
            const enc = ENCOURAGEMENT_PHRASES[Math.floor(Math.random() * ENCOURAGEMENT_PHRASES.length)];
            showEncouragementToast(enc.text, data.learned.length);
            // ✅ Utilise votre enregistrement en priorité, synthèse vocale en repli si le fichier n'existe pas encore
            window.playNormalizedAudio(enc.file).then(ok => { if (!ok) window.speakArabic(enc.text); });
        }
    }
    await window.showMenu();
};

// QUIZ
window.startQuiz=mode=>{
    quizMode=mode;quizCurrent=0;quizCorrect=0;quizWrong=0;
    quizQuestions=[...lettres].sort(()=>Math.random()-0.5).slice(0,10).map(item=>({item,choices:[...lettres.filter(l=>l.l!==item.l).sort(()=>Math.random()-0.5).slice(0,3),item].sort(()=>Math.random()-0.5)}));
    document.getElementById("quiz-intro").classList.add("hidden");document.getElementById("quiz-game").classList.remove("hidden");document.getElementById("quiz-result").classList.add("hidden");showQuestion();
};
function showQuestion(){
    if(quizCurrent>=quizQuestions.length){showQuizResult();return;}
    const q=quizQuestions[quizCurrent];
    document.getElementById("quiz-q-count").textContent=(quizCurrent+1)+"/10";
    document.getElementById("quiz-correct-count").textContent="✓ "+quizCorrect;
    document.getElementById("quiz-wrong-count").textContent="✗ "+quizWrong;
    const qEl=document.getElementById("quiz-question");qEl.innerHTML="";
    if(quizMode==="image"){const i=document.createElement("img");i.src=q.item.img;i.className="q-img";qEl.appendChild(i);}
    else if(quizMode==="letter"){const s=document.createElement("span");s.className="q-letter";s.textContent=q.item.l;qEl.appendChild(s);}
    else{const s=document.createElement("span");s.className="q-word";s.textContent=q.item.mot;qEl.appendChild(s);}
    const ce=document.getElementById("quiz-choices");ce.innerHTML="";
    q.choices.forEach(choice=>{const btn=document.createElement("button");btn.className="choice-btn";
        if(quizMode==="image"||quizMode==="word")btn.textContent=choice.l;
        else btn.innerHTML=`<img src="${choice.img}" style="width:60px;height:60px;object-fit:contain;border-radius:8px">`;
        btn.onclick=()=>{document.querySelectorAll(".choice-btn").forEach(b=>b.onclick=null);const ok=choice.l===q.item.l;btn.classList.add(ok?"correct":"wrong");if(ok)quizCorrect++;else{quizWrong++;document.querySelectorAll(".choice-btn").forEach(b=>{if((quizMode==="image"||quizMode==="word")&&b.textContent===q.item.l)b.classList.add("correct");});}quizCurrent++;setTimeout(showQuestion,900);};ce.appendChild(btn);});
}
async function showQuizResult(){
    document.getElementById("quiz-game").classList.add("hidden");document.getElementById("quiz-result").classList.remove("hidden");
    const pct=Math.round(quizCorrect/quizQuestions.length*100);
    document.getElementById("result-emoji").textContent=pct>=80?"🏆":pct>=50?"😊":"💪";
    document.getElementById("result-title").textContent=pct>=80?"ممتاز!":pct>=50?"أحسنت!":"حاول مجدداً!";
    document.getElementById("result-score").textContent=quizCorrect+" / "+quizQuestions.length+" إجابة صحيحة";
    const data=await getStudentData(currentUser);data.quizScores=data.quizScores||[];data.quizScores.push({score:quizCorrect,total:quizQuestions.length,date:new Date().toISOString(),mode:quizMode});data.lastActivity=new Date().toISOString();await saveStudentData(currentUser,data);
}
window.resetQuiz=()=>{document.getElementById("quiz-intro").classList.remove("hidden");document.getElementById("quiz-game").classList.add("hidden");document.getElementById("quiz-result").classList.add("hidden");};

// TRACÉ
function initTrace(){
    const picker=document.getElementById("trace-picker");picker.innerHTML="";
    lettres.forEach((item,i)=>{const btn=document.createElement("button");btn.className="trace-pick-btn"+(i===traceSelectedLetter?" active":"");btn.textContent=item.l;btn.onclick=()=>{traceSelectedLetter=i;document.querySelectorAll(".trace-pick-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");document.getElementById("trace-guide").textContent=item.l;clearCanvas();};picker.appendChild(btn);});
    document.getElementById("trace-guide").textContent=lettres[traceSelectedLetter].l;
    // Use enhanced canvas setup
    setupEnhancedCanvas("trace-canvas");
    drawNotebookBg();
}
window.clearCanvas=()=>{const c=document.getElementById("trace-canvas");c.getContext("2d").clearRect(0,0,c.width,c.height);};
window.saveTrace=()=>{const c=document.getElementById("trace-canvas");const a=document.createElement("a");a.download="trace_"+lettres[traceSelectedLetter].l+".png";a.href=c.toDataURL();a.click();};

// TABLEAU PROF
async function loadTeacherDashboard(){
    const all=await getAllStudents();
    const mine=Object.entries(all).filter(([id,d])=>{ const byF=d.schoolId===currentSchoolId&&d.classId===currentClassId; const byId=id.includes(currentSchoolId)&&id.includes(currentClassId); return byF||byId; });
    const avg=mine.length>0?Math.round(mine.reduce((a,[,d])=>a+(d.learned.length/lettres.length*100),0)/mine.length):0;
    const finished=mine.filter(([,d])=>d.learned.length===lettres.length).length;
    const totalQuiz=mine.reduce((a,[,d])=>a+(d.quizScores?.length||0),0);

    document.getElementById("teacher-summary").innerHTML=`
        <div class="summary-card"><div class="s-num">${mine.length}</div><div class="s-label">Élèves</div></div>
        <div class="summary-card"><div class="s-num">${avg}%</div><div class="s-label">Progression moyenne</div></div>
        <div class="summary-card"><div class="s-num">${finished}</div><div class="s-label">Terminés</div></div>
        <div class="summary-card"><div class="s-num">${totalQuiz}</div><div class="s-label">Quiz</div></div>`;

    document.getElementById("teacher-tbody").innerHTML=mine.length===0
        ?`<tr><td colspan="5" style="color:#aaa;padding:20px">Aucun élève</td></tr>`
        :mine.map(([id,data])=>{
            let name=id;
            if(data.schoolId&&data.classId){const prefix=data.schoolId+"_"+data.classId+"_";if(id.startsWith(prefix))name=id.slice(prefix.length);else name=id.split("_").slice(4).join(" ")||id.split("_").slice(2).join(" ");}else{name=id.split("_").slice(2).join(" ");}const pct=Math.round(data.learned.length/lettres.length*100);const sc=data.quizScores||[];const avgS=sc.length>0?Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length):"-";const date=data.lastActivity?new Date(data.lastActivity).toLocaleDateString("fr-FR"):"Jamais";
            const hasPin = data.pin ? "🔐" : "🔓";
            const pinBtn = `<button class="btn-pin-student" onclick="setPinForStudent('${id}', '${name}')" title="Code personnel">${hasPin}</button>`;
            const msgBtn = `<button class="btn-pin-student" onclick="openMessageModal('${id}', '${name}')" title="Envoyer un message au parent">✉️</button>`;
            return `<tr><td><strong>${name}</strong></td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div></td><td>${avgS}${avgS!=="-"?"%":""} (${sc.length})</td><td>${date}</td><td style="display:flex;gap:6px">${pinBtn}${msgBtn}<button class="btn-reset-student" onclick="resetOneStudent('${id}')">🔄</button></td></tr>`;}).join("");

    // Draw charts
    setTimeout(() => {
        drawStudentsBarChart(mine);
        drawClassDonutChart(mine, avg);
        drawLettersHardChart(mine, "chart-letters-teacher");
    }, 100);
}
function buildHeatmap(students,gridId){
    const fail=new Array(lettres.length).fill(0);
    students.forEach(([,d])=>lettres.forEach((_,i)=>{if(!d.learned.includes(i))fail[i]++;}));
    const max=Math.max(...fail,1);
    document.getElementById(gridId).innerHTML=lettres.map((item,i)=>{const h=fail[i]/max;const r=Math.round(255*h),g=Math.round(255*(1-h*0.7));return `<div class="heat-cell" style="background:rgba(${r},${g},80,0.2);border:2px solid rgba(${r},${g},80,0.5)"><span>${item.l}</span><span class="heat-label">${fail[i]}</span></div>`;}).join("");
}
window.resetOneStudent=async id=>{if(!confirm("Réinitialiser cet élève ?"))return;await delStudent(id);await loadTeacherDashboard();};

// ✅ MESSAGES POUR LES PARENTS
let messageTargetStudentId = null;
window.openMessageModal = (studentId, studentName) => {
    messageTargetStudentId = studentId;
    document.getElementById("msg-student-name").textContent = studentName;
    document.getElementById("msg-category").value = "general";
    document.getElementById("msg-text").value = "";
    document.getElementById("modal-message").classList.remove("hidden");
};
window.closeMessageModal = () => {
    document.getElementById("modal-message").classList.add("hidden");
    messageTargetStudentId = null;
};
window.sendParentMessage = async () => {
    const text = document.getElementById("msg-text").value.trim();
    const category = document.getElementById("msg-category").value;
    if (!text) { alert("Merci d'écrire un message avant d'envoyer."); return; }
    if (!messageTargetStudentId) return;
    const data = await getStudentData(messageTargetStudentId);
    if (!data.parentMessages) data.parentMessages = [];
    data.parentMessages.push({
        date: new Date().toISOString(),
        category,
        text,
        author: currentRole === "teacher" ? "المعلم / Professeur" : "الإدارة / Direction",
    });
    await saveStudentData(messageTargetStudentId, data);
    window.closeMessageModal();
    alert("✅ تم إرسال الرسالة! / Message envoyé !");
};

// ✅ Attribuer/modifier le code personnel d un élève
window.setPinForStudent = async (studentId, studentName) => {
    const data = await getStudentData(studentId);
    const currentPin = data.pin || "";
    const msg = currentPin
        ? `🔐 ${studentName} a déjà un code: ${currentPin}
Nouveau code (laisser vide pour supprimer):`
        : `🔓 Créer un code personnel pour ${studentName}:`;
    const newPin = prompt(msg, currentPin);
    if (newPin === null) return; // Annulé
    data.pin = newPin.trim() || null;
    if (!data.pin) delete data.pin;
    await saveStudentData(studentId, data);
    await loadTeacherDashboard();
    alert(newPin.trim()
        ? `✅ Code ${newPin.trim()} attribué à ${studentName}`
        : `🔓 Code supprimé pour ${studentName}`
    );
};
window.resetAllStudents=async()=>{
    if(!confirm("⚠️ Effacer TOUS les élèves de cette classe ?"))return;
    const all=await getAllStudents();
    for(const[id,d]of Object.entries(all))if(d.schoolId===currentSchoolId&&d.classId===currentClassId)await delStudent(id);
    await loadTeacherDashboard();
};

// ADMIN ÉCOLE
async function loadSchoolAdminDashboard(){
    let school=(await getDoc(doc(db,"ecoles",currentSchoolId))).data();
    await saLoadClasses(school); await saLoadTeachers(school); await saLoadStats();
    const logoInput=document.getElementById("sa-logo-url");
    if(logoInput){ logoInput.value=school?.logoUrl||""; window.saPreviewLogo(); }

    // 🔑 Afficher le code d'école, ou en générer un si l'école n'en a pas encore (créée avant cette mise à jour)
    const codeDisplay = document.getElementById("sa-school-code-display");
    if (codeDisplay) {
        if (!school?.code && !isDemoMode) {
            const existingSchools = await getSchools();
            const existingCodes = new Set(Object.values(existingSchools).map(s => (s.code || "").toUpperCase()));
            let newCode;
            do { newCode = "ECO-" + Math.floor(1000 + Math.random() * 9000); } while (existingCodes.has(newCode));
            await setDoc(doc(db,"ecoles",currentSchoolId), { code: newCode }, { merge: true });
            school = { ...school, code: newCode };
        }
        codeDisplay.textContent = isDemoMode ? "ECO-DEMO" : (school?.code || "—");
    }
}

// ================================================================
// ===== MODE DÉMO — 100% local, aucune écriture/lecture Firebase =====
// ================================================================
const DEMO_FIRST_NAMES = ["Yassine","Sara","Adam","Lina","Rayan","Nour","Mehdi","Ines","Anas","Salma","Zakaria","Meryem","Ilyas","Hiba","Karim"];
const DEMO_LAST_NAMES  = ["Alami","Benjelloun","Idrissi","Tazi","Fassi","Bennani","Ouazzani","Chraibi","El Amrani","Berrada"];
const DEMO_TEACHER_NAMES = ["Fatima Zahra Idrissi","Youssef El Amrani","Khadija Bennani"];

function generateDemoData(){
    const classDefs = [
        {id:"demo_c1", name:"CP - A", code:"CLS-DEMO1"},
        {id:"demo_c2", name:"CP - B", code:"CLS-DEMO2"},
        {id:"demo_c3", name:"CE1 - A", code:"CLS-DEMO3"},
    ];
    const school = {
        name: "École Al Ihssane (Démo)",
        city: "Casablanca",
        classes: Object.fromEntries(classDefs.map(c => [c.id, {name:c.name, code:c.code, createdAt:new Date().toISOString()}]))
    };

    const teachers = classDefs.map((c,i) => ({
        email: `demo.prof${i+1}@ecole-demo.ma`,
        name: DEMO_TEACHER_NAMES[i],
        classId: c.id,
        password: "demo",
        activationCode: "ACT-DEMO"+(i+1)
    }));

    let nameIdx = 0;
    const students = [];
    classDefs.forEach((c, ci) => {
        const count = 8 + ci*3; // 8, 11, 14 élèves selon la classe
        for (let i=0; i<count; i++){
            const first = DEMO_FIRST_NAMES[nameIdx % DEMO_FIRST_NAMES.length];
            const last  = DEMO_LAST_NAMES[(nameIdx*3) % DEMO_LAST_NAMES.length];
            nameIdx++;
            const id = `demo_school_${c.id}_${first} ${last}`;

            // Progression lettres aléatoire mais cohérente (certains élèves plus avancés)
            const level = Math.random(); // 0 = débutant, 1 = avancé
            const nbLearned = Math.round(level * lettres.length);
            const learned = [...Array(lettres.length).keys()].sort(()=>Math.random()-0.5).slice(0, nbLearned);

            // Progression Coran aléatoire, cohérente avec le niveau de l'élève
            const quranMemorized = {};
            SURAHS.forEach(s => {
                if (Math.random() < level * 0.8) {
                    const nb = Math.round(Math.random() * s.ayahs);
                    quranMemorized[s.id] = [...Array(s.ayahs).keys()].map(n=>n+1).slice(0, nb);
                }
            });

            const quizScores = [];
            const nbQuiz = Math.round(level * 5);
            for (let q=0; q<nbQuiz; q++){
                quizScores.push({score: 5+Math.round(Math.random()*5), total:10, date:new Date(Date.now()-q*86400000).toISOString(), mode:"random"});
            }

            const daysAgo = Math.round(Math.random()*6);
            students.push([id, {
                learned, quranMemorized, quizScores,
                schoolId: "demo_school", classId: c.id,
                lastActivity: new Date(Date.now()-daysAgo*86400000).toISOString()
            }]);
        }
    });

    return { school, teachers, students };
}

const DEMO_ACCESS_CODE = "HOUROUF-2026"; // ✏️ Changez ce code quand vous voulez

window.startDemoMode = () => {
    const code = prompt("🔒 Code d'accès démo :");
    if (code === null) return; // annulé
    if (code.trim().toUpperCase() !== DEMO_ACCESS_CODE) {
        alert("❌ Code incorrect.");
        return;
    }
    isDemoMode = true;
    currentRole = "schooladmin";
    currentSchoolId = "demo_school";
    currentUser = "demo_admin";
    showScreen("screen-schooladmin");
    document.getElementById("schooladmin-title").textContent = "🎬 École Démo — Mode Démonstration";
    const demo = generateDemoData();
    demo.school.logoUrl = "https://api.dicebear.com/7.x/icons/svg?seed=EcoleDemo&backgroundColor=667eea";
    demo.school.uiLang = "en"; // Démo : montre la traduction (anglais) pour vos présentations
    applySchoolBranding(demo.school);
    applyFeatureTranslations(demo.school.uiLang);
    window._demoData = demo;
    loadDemoDashboard(demo);
    setTimeout(() => {
        const logoInput = document.getElementById("sa-logo-url");
        if (logoInput) { logoInput.value = demo.school.logoUrl; window.saPreviewLogo(); }
    }, 50);
    // Ouvrir directement l'onglet Statistiques, le plus parlant pour une démo
    const statsBtn = document.querySelector('.admin-tab[onclick*="sa-stats"]');
    if (statsBtn) switchAdminTab("sa-stats", statsBtn);
};

function loadDemoDashboard({school, teachers, students}){
    const codeDisplay = document.getElementById("sa-school-code-display");
    if (codeDisplay) codeDisplay.textContent = "ECO-DEMO";
    // --- Classes ---
    document.getElementById("sa-classes-list").innerHTML = Object.entries(school.classes).map(([cid,cl]) => {
        const stuCount = students.filter(([,d]) => d.classId===cid).length;
        return `<div class="school-card"><div class="school-card-header"><strong>📚 ${cl.name}</strong><div style="display:flex;align-items:center;gap:8px"><span class="code-badge">🔑 ${cl.code}</span><span class="btn-sm-add" style="background:var(--purple)">👥 ${stuCount} élève(s)</span></div></div><p style="color:#888;font-size:13px;margin:5px 0 0 0">Code à donner aux élèves : <strong style="color:#e67e22;font-size:16px">${cl.code}</strong></p></div>`;
    }).join("") + `<p style="color:#aaa;font-size:13px;padding:10px;text-align:center">🎬 Données fictives à titre d'exemple — la gestion (ajout/suppression) est désactivée en mode démo</p>`;

    // --- Professeurs ---
    document.getElementById("sa-teachers-list").innerHTML =
        `<table class="teacher-table"><thead><tr><th>Nom</th><th>Email</th><th>Classe</th><th>Statut</th><th>Code</th></tr></thead><tbody>`+
        teachers.map(t => {
            const cls = school.classes[t.classId]?.name || "?";
            return `<tr><td>${t.name}</td><td dir="ltr">${t.email}</td><td>${cls}</td><td><span class="badge-active">✅ Actif</span></td><td><code>${t.activationCode}</code></td></tr>`;
        }).join("") + "</tbody></table>";

    // --- Statistiques (résumé + tableau + graphiques) ---
    const avg = students.length>0 ? Math.round(students.reduce((a,[,d])=>a+(d.learned.length/lettres.length*100),0)/students.length) : 0;
    const finished = students.filter(([,d])=>d.learned.length===lettres.length).length;
    const totalQuiz = students.reduce((a,[,d])=>a+(d.quizScores?.length||0),0);
    const quranAvg = students.length>0 ? Math.round(students.reduce((a,[,d])=>a+quranPct(d),0)/students.length) : 0;

    document.getElementById("sa-summary").innerHTML = `
        <div class="summary-card"><div class="s-num">${students.length}</div><div class="s-label">Élèves total</div></div>
        <div class="summary-card"><div class="s-num">${avg}%</div><div class="s-label">Progression moyenne</div></div>
        <div class="summary-card"><div class="s-num">${finished}</div><div class="s-label">Terminés</div></div>
        <div class="summary-card"><div class="s-num">${totalQuiz}</div><div class="s-label">Quiz</div></div>
        <div class="summary-card"><div class="s-num">${quranAvg}%</div><div class="s-label">📖 Coran moyen</div></div>`;

    document.getElementById("sa-tbody").innerHTML = students.map(([id,data]) => {
        const name = id.split("_").slice(3).join(" ");
        const cls = school.classes[data.classId]?.name || "?";
        const pct = Math.round(data.learned.length/lettres.length*100);
        const sc = data.quizScores||[];
        const avgS = sc.length>0 ? Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length) : "-";
        const date = data.lastActivity ? new Date(data.lastActivity).toLocaleDateString("fr-FR") : "Jamais";
        const qPct = quranPct(data);
        return `<tr><td>${name}</td><td>${cls}</td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div></td><td>${avgS}${avgS!=="-"?"%":""} (${sc.length})</td><td>${date}</td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${qPct}%;background:#43e97b"></div></div><span>${qPct}%</span></div></td><td><button class="btn-pin-student" disabled title="Désactivé en mode démo" style="opacity:0.4">✉️</button></td></tr>`;
    }).join("");

    setTimeout(() => {
        drawClassesBarChart(students, school);
        drawSchoolDonutChart(students, avg, finished);
        drawLettersHardChart(students, "chart-letters-hard");
        drawClassesQuranChart(students, school);
    }, 100);
}


async function saLoadClasses(school){
    const classes=school?.classes?Object.entries(school.classes):[];
    const el=document.getElementById("sa-classes-list");
    el.innerHTML=classes.length===0?`<p style="color:#aaa;padding:20px">Aucune classe — ajoutez-en une</p>`:
    classes.map(([cid,cl])=>{
        const stuCount=cl.students?cl.students.length:0;
        return `<div class="school-card"><div class="school-card-header"><strong>📚 ${cl.name}</strong><div style="display:flex;align-items:center;gap:8px"><span class="code-badge">🔑 ${cl.code||"N/A"}</span><button onclick="openStuPanel('${cid}','${cl.name}')" class="btn-sm-add" style="background:var(--purple)">👥 ${stuCount} élève(s)</button><button onclick="saDeleteClass('${cid}')" class="btn-delete">🗑️</button></div></div><p style="color:#888;font-size:13px;margin:5px 0 0 0">Code à donner aux élèves : <strong style="color:#e67e22;font-size:16px">${cl.code||"N/A"}</strong></p></div>`;
    }).join("");
    // Populate teacher class select
    const sel=document.getElementById("sa-teacher-class");
    sel.innerHTML='<option value="">-- Classe --</option>';
    classes.forEach(([cid,cl])=>sel.innerHTML+=`<option value="${cid}">${cl.name}</option>`);
}

window.saAddClass=async()=>{
    if(isDemoMode){alert("🎬 Mode démo : ajout désactivé.\nCette action serait possible avec un vrai compte école.");return;}
    const name=document.getElementById("sa-class-name").value.trim();
    if(!name){alert("Entrez un nom de classe");return;}
    const snap=await getDoc(doc(db,"ecoles",currentSchoolId));const school=snap.data();
    const classCode="CLS-"+Math.random().toString(36).substr(2,5).toUpperCase();
    school.classes=school.classes||{};school.classes["class_"+Date.now()]={name,code:classCode,createdAt:new Date().toISOString()};
    await setDoc(doc(db,"ecoles",currentSchoolId),school);
    document.getElementById("sa-class-name").value="";
    alert("✅ Classe créée !\n\n📚 Classe : " + name + "\n🔑 Code : " + classCode + "\n\nCommuniquez ce code aux élèves !");
    await loadSchoolAdminDashboard();
};

window.saDeleteClass=async cid=>{
    if(isDemoMode){alert("🎬 Mode démo : suppression désactivée.");return;}
    if(!confirm("Supprimer cette classe ?"))return;
    const snap=await getDoc(doc(db,"ecoles",currentSchoolId));const school=snap.data();
    delete school.classes[cid];await setDoc(doc(db,"ecoles",currentSchoolId),school);
    await loadSchoolAdminDashboard();
};

async function saLoadTeachers(school){
    const allTeachers=await getTeachers();
    const myTeachers=Object.entries(allTeachers).filter(([,t])=>t.schoolId===currentSchoolId);
    const classes=school?.classes||{};
    document.getElementById("sa-teachers-list").innerHTML=myTeachers.length===0
        ?`<p style="color:#aaa;padding:20px">Aucun professeur</p>`
        :`<table class="teacher-table"><thead><tr><th>Nom</th><th>Email</th><th>Classe</th><th>Statut</th><th>Code</th><th>⚙️</th></tr></thead><tbody>`+
        myTeachers.map(([email,t])=>{const cls=classes[t.classId]?.name||"?";const status=t.password?`<span class="badge-active">✅ Actif</span>`:`<span class="badge-pending">⏳ En attente</span>`;
            return `<tr><td>${t.name}</td><td dir="ltr">${email}</td><td>${cls}</td><td>${status}</td><td><code>${t.activationCode}</code></td><td><button onclick="saDeleteTeacher('${email}')" class="btn-delete">🗑️</button></td></tr>`;}).join("")+"</tbody></table>";
}

window.saAddTeacher=async()=>{
    if(isDemoMode){alert("🎬 Mode démo : ajout désactivé.\nCette action serait possible avec un vrai compte école.");return;}
    const name=document.getElementById("sa-teacher-name").value.trim();
    const email=document.getElementById("sa-teacher-email").value.trim().toLowerCase();
    const classId=document.getElementById("sa-teacher-class").value;
    if(!name||!email||!classId){alert("Tous les champs sont requis");return;}
    const code="ACT-"+Math.random().toString(36).substr(2,6).toUpperCase();
    await setDoc(doc(db,"profs",email),{name,email,schoolId:currentSchoolId,classId,activationCode:code,createdAt:new Date().toISOString()});
    const res=document.getElementById("sa-teacher-code-result");
    res.innerHTML=`✅ Professeur ajouté !<br>📧 <strong>${email}</strong><br>🔑 Code activation: <strong style="color:var(--primary);font-size:20px">${code}</strong>`;
    res.classList.remove("hidden");
    document.getElementById("sa-teacher-name").value="";document.getElementById("sa-teacher-email").value="";
    await loadSchoolAdminDashboard();
};

window.saDeleteTeacher=async email=>{if(isDemoMode){alert("🎬 Mode démo : suppression désactivée.");return;}if(!confirm("Supprimer ce professeur ?"))return;await deleteDoc(doc(db,"profs",email));await loadSchoolAdminDashboard();};

async function saLoadStats(){
    const all=await getAllStudents();const school=(await getDoc(doc(db,"ecoles",currentSchoolId))).data();
    const mine=Object.entries(all).filter(([,d])=>d.schoolId===currentSchoolId);
    const avg=mine.length>0?Math.round(mine.reduce((a,[,d])=>a+(d.learned.length/lettres.length*100),0)/mine.length):0;
    const finished=mine.filter(([,d])=>d.learned.length===lettres.length).length;
    const totalQuiz=mine.reduce((a,[,d])=>a+(d.quizScores?.length||0),0);
    const quranAvg=mine.length>0?Math.round(mine.reduce((a,[,d])=>a+quranPct(d),0)/mine.length):0;

    document.getElementById("sa-summary").innerHTML=`
        <div class="summary-card"><div class="s-num">${mine.length}</div><div class="s-label">Élèves total</div></div>
        <div class="summary-card"><div class="s-num">${avg}%</div><div class="s-label">Progression moyenne</div></div>
        <div class="summary-card"><div class="s-num">${finished}</div><div class="s-label">Terminés</div></div>
        <div class="summary-card"><div class="s-num">${totalQuiz}</div><div class="s-label">Quiz</div></div>
        <div class="summary-card"><div class="s-num">${quranAvg}%</div><div class="s-label">📖 Coran moyen</div></div>`;

    document.getElementById("sa-tbody").innerHTML=mine.length===0
        ?`<tr><td colspan="7" style="color:#aaa;padding:20px">Aucun élève</td></tr>`
        :mine.map(([id,data])=>{
            let name=id;
            if(data.schoolId&&data.classId){const prefix=data.schoolId+"_"+data.classId+"_";if(id.startsWith(prefix))name=id.slice(prefix.length);else name=id.split("_").slice(4).join(" ")||id.split("_").slice(2).join(" ");}else{name=id.split("_").slice(2).join(" ");}const cls=school?.classes?.[data.classId]?.name||"?";const pct=Math.round(data.learned.length/lettres.length*100);const sc=data.quizScores||[];const avgS=sc.length>0?Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length):"-";const date=data.lastActivity?new Date(data.lastActivity).toLocaleDateString("fr-FR"):"Jamais";const qPct=quranPct(data);
            return `<tr><td>${name}</td><td>${cls}</td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div></td><td>${avgS}${avgS!=="-"?"%":""} (${sc.length})</td><td>${date}</td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${qPct}%;background:#43e97b"></div></div><span>${qPct}%</span></div></td><td><button class="btn-pin-student" onclick="openMessageModal('${id}', '${name}')" title="Envoyer un message au parent">✉️</button></td></tr>`;}).join("");

    // Draw charts
    setTimeout(() => {
        drawClassesBarChart(mine, school);
        drawSchoolDonutChart(mine, avg, finished);
        drawLettersHardChart(mine, "chart-letters-hard");
        drawClassesQuranChart(mine, school);
    }, 100);
}

window.switchAdminTab=(name,btn)=>{
    document.querySelectorAll(".admin-tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    document.querySelectorAll(".admin-tab-content").forEach(t=>t.classList.add("hidden"));
    document.getElementById("admin-tab-"+name).classList.remove("hidden");
    if(name==="sa-absences") initDirectorAbsences();
};

// SUPER ADMIN
async function loadSuperAdminDashboard(){
    await supLoadSchools(); await supLoadStats();
}

async function supLoadSchools(){
    const schools=await getSchools();const el=document.getElementById("sup-schools-list");
    el.innerHTML=Object.keys(schools).length===0?`<p style="color:#aaa;padding:20px">Aucune école</p>`:
    Object.entries(schools).map(([id,s])=>{
        const classes=s.classes?Object.keys(s.classes).length:0;
        const langBadge = {fr:"🇫🇷",nl:"🇳🇱",en:"🇬🇧",es:"🇪🇸"}[s.uiLang] || "🇸🇦";
        return `<div class="school-card"><div class="school-card-header">
            <div><strong>🏫 ${s.name}</strong> <span class="school-city">${s.city}</span> <span class="school-city">${classes} classe(s)</span> <span class="school-city">${langBadge}</span></div>
            <div>${s.code ? `<span class="code-badge" style="margin-inline-end:8px">🔑 ${s.code}</span>` : `<button onclick="supGenerateSchoolCode('${id}')" class="btn-sm-add" style="margin-inline-end:8px">🔑 Générer un code</button>`}<span class="school-city" style="color:var(--text-light)">${s.adminEmail||""}</span> <button onclick="supDeleteSchool('${id}')" class="btn-delete">🗑️</button></div>
        </div></div>`;}).join("");
}

window.supGenerateSchoolCode = async (schoolId) => {
    const existingSchools = await getSchools();
    const existingCodes = new Set(Object.values(existingSchools).map(s => (s.code || "").toUpperCase()));
    let schoolCode;
    do { schoolCode = "ECO-" + Math.floor(1000 + Math.random() * 9000); } while (existingCodes.has(schoolCode));
    await setDoc(doc(db,"ecoles",schoolId), { code: schoolCode }, { merge: true });
    await supLoadSchools();
};

window.supAddSchool=async()=>{
    const name=document.getElementById("sup-school-name").value.trim();
    const city=document.getElementById("sup-school-city").value.trim();
    const email=document.getElementById("sup-admin-email").value.trim().toLowerCase();
    const pwd=document.getElementById("sup-admin-pwd").value;
    const uiLang=document.getElementById("sup-school-lang").value; // "" | "fr" | "nl" | "en" | "es" — figé à la création
    if(!name||!city||!email||!pwd){alert("Tous les champs sont requis");return;}
    const schoolId="school_"+Date.now();
    // ✅ Génère un code d'école unique (ex: ECO-4821) que les élèves saisiront pour rejoindre l'école,
    // sans jamais voir la liste des autres écoles.
    const existingSchools = await getSchools();
    const existingCodes = new Set(Object.values(existingSchools).map(s => (s.code || "").toUpperCase()));
    let schoolCode;
    do { schoolCode = "ECO-" + Math.floor(1000 + Math.random() * 9000); } while (existingCodes.has(schoolCode));
    await setDoc(doc(db,"ecoles",schoolId),{name,city,code:schoolCode,uiLang,adminEmail:email,classes:{},createdAt:new Date().toISOString()});
    await setDoc(doc(db,"school_admins",email),{email,schoolId,password:btoa(pwd),createdAt:new Date().toISOString()});
    const langLabel = {fr:"🇫🇷 Français",nl:"🇳🇱 Néerlandais",en:"🇬🇧 Anglais",es:"🇪🇸 Espagnol"}[uiLang] || "🇸🇦 Arabe uniquement";
    const res=document.getElementById("sup-school-result");
    res.innerHTML=`✅ École créée !<br>🏫 <strong>${name}</strong> - ${city}<br>🔑 Code école (à donner aux élèves) : <strong style="color:#e67e22;font-size:18px">${schoolCode}</strong><br>🌐 Langue : <strong>${langLabel}</strong><br>📧 Admin: <strong>${email}</strong><br>🔑 Mot de passe: <strong>${pwd}</strong>`;
    res.classList.remove("hidden");
    ["sup-school-name","sup-school-city","sup-admin-email","sup-admin-pwd"].forEach(id=>document.getElementById(id).value="");
    document.getElementById("sup-school-lang").value="";
    await supLoadSchools();
};

window.supDeleteSchool=async id=>{
    if(!confirm("Supprimer cette école et toutes ses données ?"))return;
    await deleteDoc(doc(db,"ecoles",id));await supLoadSchools();
};

async function supLoadStats(){
    const all=await getAllStudents();const schools=await getSchools();const entries=Object.entries(all);
    const avg=entries.length>0?Math.round(entries.reduce((a,[,d])=>a+(d.learned.length/lettres.length*100),0)/entries.length):0;
    document.getElementById("sup-summary").innerHTML=`
        <div class="summary-card"><div class="s-num">${Object.keys(schools).length}</div><div class="s-label">Écoles</div></div>
        <div class="summary-card"><div class="s-num">${entries.length}</div><div class="s-label">Élèves total</div></div>
        <div class="summary-card"><div class="s-num">${avg}%</div><div class="s-label">Progression moyenne</div></div>
        <div class="summary-card"><div class="s-num">${entries.filter(([,d])=>d.learned.length===lettres.length).length}</div><div class="s-label">Terminés</div></div>`;
    document.getElementById("sup-tbody").innerHTML=entries.length===0
        ?`<tr><td colspan="7" style="color:#aaa;padding:20px">Aucun élève</td></tr>`
        :entries.map(([id,data])=>{
            // Extract real name: ID = schoolId_classId_Firstname Lastname
            // schoolId starts with "school_", classId starts with "class_"
            const school=schools[data.schoolId];
            const cls=school?.classes?.[data.classId]?.name||"?";
            // Get name by removing schoolId and classId prefix
            let name = id;
            if(data.schoolId && data.classId) {
                const prefix = data.schoolId + "_" + data.classId + "_";
                if(id.startsWith(prefix)) name = id.slice(prefix.length);
                else name = id.split("_").slice(4).join(" ") || id.split("_").slice(2).join(" ");
            } else {
                name = id.split("_").slice(2).join(" ");
            }
            const pct=Math.round(data.learned.length/lettres.length*100);
            const sc=data.quizScores||[];
            const avgS=sc.length>0?Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length):"-";
            const date=data.lastActivity?new Date(data.lastActivity).toLocaleDateString("fr-FR"):"Jamais";
            return `<tr><td><strong>${name}</strong></td><td>${school?.name||"❓"}</td><td>${cls}</td><td><div class="progress-mini"><div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div></td><td>${avgS}${avgS!=="-"?"%":""} (${sc.length})</td><td>${date}</td><td><button class="btn-reset-student" onclick="supDeleteStudent('${id}')">🗑️</button></td></tr>`;
        }).join("");
}

// EXPORT
window.exportData=async role=>{
    if(isDemoMode){alert("🎬 Mode démo : export désactivé.\nCette action serait possible avec un vrai compte école.");return;}
    const all=await getAllStudents();const schools=await getSchools();
    let entries=Object.entries(all);
    if(role==="teacher") entries=entries.filter(([,d])=>d.schoolId===currentSchoolId&&d.classId===currentClassId);
    else if(role==="school") entries=entries.filter(([,d])=>d.schoolId===currentSchoolId);
    const BOM="\uFEFF";
    const header=role==="super"?["Élève","École","Classe","Progression %","Quiz","Score moyen %","Dernière activité"]:["Élève","Classe","Progression %","Quiz","Score moyen %","Dernière activité"];
    const rows=[header,...entries.map(([id,data])=>{
        const name=extractStudentName(id,data.schoolId,data.classId);const pct=Math.round(data.learned.length/lettres.length*100);const sc=data.quizScores||[];const avg=sc.length>0?Math.round(sc.reduce((a,s)=>a+(s.score/s.total*100),0)/sc.length):"";const date=data.lastActivity?new Date(data.lastActivity).toLocaleDateString("fr-FR"):"";
        const school=schools[data.schoolId];const cls=school?.classes?.[data.classId]?.name||"?";
        if(role==="super")return[name,school?.name||"?",cls,pct,sc.length,avg,date];
        return[name,cls,pct,sc.length,avg,date];
    })];
    const blob=new Blob([BOM+rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8;"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rapport_hourouf_"+new Date().toISOString().slice(0,10)+".csv";a.click();
};

function showBravoBadge(){const b=document.getElementById("badge-bravo");b.classList.remove("hidden");setTimeout(()=>b.classList.add("hidden"),4000);b.onclick=()=>b.classList.add("hidden");}

// INIT
document.addEventListener("DOMContentLoaded",async()=>{
    showScreen("screen-login");
    const studentNameEl = document.getElementById("student-name"); if(studentNameEl) studentNameEl.addEventListener("keydown",e=>{if(e.key==="Enter")window.loginStudent();});
});

// ============================================
//  EXERCICES - Fonctionnalité complète
// ============================================

// Firebase refs for exercises
const saveExercise   = async (id, data) => setDoc(doc(db, "exercices", id), data);
const getExercises   = async () => { const s = await getDocs(collection(db, "exercices")); const r = {}; s.forEach(d => r[d.id] = d.data()); return r; };
const saveSubmission = async (id, data) => setDoc(doc(db, "soumissions", id), data);
const getSubmissions = async () => { const s = await getDocs(collection(db, "soumissions")); const r = {}; s.forEach(d => r[d.id] = d.data()); return r; };

let currentExType = "letter";

// ====== TEACHER TABS ======
window.switchTeacherTab = (name, btn) => {
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active")); btn.classList.add("active");
    document.querySelectorAll(".admin-tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById("teacher-tab-" + name).classList.remove("hidden");
    if (name === "t-students") loadTeacherDashboard(); // ✅ Recharger avec boutons PIN
    if (name === "t-exercises") loadTeacherExercises();
    if (name === "t-submissions") loadSubmissions();
    if (name === "t-classlist") loadTeacherClassList();
    if (name === "t-attendance") initAttendanceTab();
};

// ====== EXERCISE TYPE SELECT ======
window.selectExType = (type, btn) => {
    currentExType = type;
    document.querySelectorAll(".ex-type-btn").forEach(b => b.classList.remove("active")); btn.classList.add("active");
    ["letter","word","forme","free"].forEach(t => document.getElementById("ex-"+t+"-input").classList.toggle("hidden", t !== type));
};

// ====== POPULATE LETTER SELECT ======
function populateLetterSelect() {
    ["ex-letter-select","ex-forme-letter"].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Choisir une lettre --</option>';
        lettres.forEach(item => sel.innerHTML += `<option value="${item.l}">${item.l} - ${item.mot}</option>`);
    });
}

// ====== POPULATE STUDENT SELECT — avec checkboxes ======
async function populateStudentSelect() {
    const container = document.getElementById("ex-target-container");
    if (!container) return;

    // FIX: charger la liste des élèves depuis le registre de la classe (Firestore ecoles)
    // pour inclure TOUS les élèves même ceux qui ne se sont jamais connectés
    let studentNames = [];
    try {
        const schoolSnap = await getDoc(doc(db, "ecoles", currentSchoolId));
        const schoolData = schoolSnap.data();
        const classData = schoolData?.classes?.[currentClassId];
        if (classData && Array.isArray(classData.students)) {
            studentNames = classData.students.sort();
        }
    } catch(e) {
        console.warn("populateStudentSelect: impossible de charger le registre", e);
    }

    // Fallback : si pas de registre, utiliser la collection eleves
    if (studentNames.length === 0) {
        const all = await getAllStudents();
        const found = Object.entries(all).filter(([id, d]) => {
            const byFields = d.schoolId === currentSchoolId && d.classId === currentClassId;
            const prefix1 = currentSchoolId + "_" + currentClassId + "_";
            const byId1 = id.startsWith(prefix1);
            const byId2 = id.includes(currentSchoolId) && id.includes(currentClassId);
            return byFields || byId1 || byId2;
        });
        studentNames = found.map(([id]) => extractStudentName(id, currentSchoolId, currentClassId)).sort();
    }

    // Construire l'ID composé pour chaque élève (format utilisé dans Firestore)
    const buildStudentId = (name) => currentSchoolId + "_" + currentClassId + "_" + name;

    container.innerHTML = `
        <div style="margin-bottom:8px">
            <label style="font-weight:600;font-size:14px">🎯 Assigner à :</label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <button type="button" onclick="toggleAllStudents(true)"
                style="font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid var(--primary);background:var(--primary);color:white;cursor:pointer">
                ✅ Tous
            </button>
            <button type="button" onclick="toggleAllStudents(false)"
                style="font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #ccc;background:white;cursor:pointer">
                ☐ Aucun
            </button>
        </div>
        <div id="student-checkboxes" style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:8px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" value="all" id="cb-all" onchange="handleAllCheckbox(this)" checked
                    style="width:16px;height:16px;cursor:pointer">
                <span>👥 Toute la classe</span>
            </label>
            ${studentNames.map(name => {
                const id = buildStudentId(name);
                return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" value="${id}" class="cb-student" onchange="handleStudentCheckbox()"
                        style="width:16px;height:16px;cursor:pointer">
                    <span>👦 ${name}</span>
                </label>`;
            }).join("")}
        </div>
    `;
}

window.toggleAllStudents = (check) => {
    document.getElementById("cb-all").checked = check;
    document.querySelectorAll(".cb-student").forEach(cb => cb.checked = check ? false : false);
    if (check) document.getElementById("cb-all").checked = true;
    handleStudentCheckbox();
};

window.handleAllCheckbox = (el) => {
    if (el.checked) document.querySelectorAll(".cb-student").forEach(cb => cb.checked = false);
};

window.handleStudentCheckbox = () => {
    const anyStudent = [...document.querySelectorAll(".cb-student")].some(cb => cb.checked);
    if (anyStudent) document.getElementById("cb-all").checked = false;
    else document.getElementById("cb-all").checked = true;
};

function getSelectedTargets() {
    const allCb = document.getElementById("cb-all");
    if (allCb && allCb.checked) return ["all"];
    const checked = [...document.querySelectorAll(".cb-student:checked")].map(cb => cb.value);
    return checked.length > 0 ? checked : ["all"];
}

// ====== CREATE EXERCISE ======
window.createExercise = async () => {
    let consigne = "", type = currentExType;
    if (type === "letter") {
        consigne = document.getElementById("ex-letter-select").value;
        if (!consigne) { alert("Choisissez une lettre"); return; }
    } else if (type === "word") {
        consigne = document.getElementById("ex-word").value.trim();
        if (!consigne) { alert("Entrez un mot"); return; }
    } else if (type === "forme") {
        const selectedLetter = document.getElementById("ex-forme-letter").value;
        if (!selectedLetter) { alert("Choisissez une lettre pour l'exercice de formes"); return; }
        // Store letter INDEX to avoid encoding issues
        const letterIdx = lettres.findIndex(l => l.l === selectedLetter);
        consigne = letterIdx >= 0 ? String(letterIdx) : "0";
    } else {
        consigne = document.getElementById("ex-free-text").value.trim();
        if (!consigne) { alert("Entrez une consigne"); return; }
    }
    const targets = getSelectedTargets();
    const deadline = document.getElementById("ex-deadline").value;

    // Créer un exercice pour chaque cible sélectionnée
    for (const target of targets) {
        const exId = "ex_" + Date.now() + "_" + Math.random().toString(36).substr(2,5);
        await saveExercise(exId, {
            type, consigne, target,
            deadline: deadline || null,
            schoolId: currentSchoolId,
            classId: currentClassId,
            teacherId: currentUser,
            createdAt: new Date().toISOString(),
            active: true
        });
    }

    // Reset form
    document.getElementById("ex-letter-select").value = "";
    document.getElementById("ex-word").value = "";
    document.getElementById("ex-free-text").value = "";
    toggleAllStudents(true);

    alert(targets[0] === "all"
        ? "✅ Exercice publié pour toute la classe !"
        : `✅ Exercice publié pour ${targets.length} élève(s) !`
    );
    await loadTeacherExercises();
};

// ====== LOAD TEACHER EXERCISES ======
async function loadTeacherExercises() {
    populateLetterSelect();
    await populateStudentSelect();
    const exs = await getExercises();
    const mine = Object.entries(exs).filter(([, e]) => e.schoolId === currentSchoolId && e.classId === currentClassId);
    const subs = await getSubmissions();
    const el = document.getElementById("teacher-exercises-list");
    if (!el) return;
    if (mine.length === 0) { el.innerHTML = `<p style="color:#aaa;padding:20px;text-align:center">Aucun exercice créé</p>`; return; }

    el.innerHTML = mine.sort((a,b) => b[1].createdAt.localeCompare(a[1].createdAt)).map(([id, ex]) => {
        const subsForEx = Object.values(subs).filter(s => s.exerciceId === id);
        const typeIcon = ex.type==="letter"?"🔤":ex.type==="word"?"📝":ex.type==="forme"?"🔀":"✏️";
        const typeLabel = ex.type==="letter"?"Lettre":ex.type==="word"?"Mot":ex.type==="forme"?"Formes":"Libre";
        const targetLabel = ex.target==="all"?"👥 Toute la classe":`👦 ${extractStudentName(ex.target, ex.schoolId||currentSchoolId, ex.classId||currentClassId)}`;
        const deadline = ex.deadline ? `📅 ${new Date(ex.deadline).toLocaleDateString("fr-FR")}` : "";
        // For forme type, show letter name instead of index
        let consigneDisplay = ex.consigne;
        if (ex.type === "forme") {
            const idx = parseInt(ex.consigne);
            consigneDisplay = (!isNaN(idx) && idx >= 0 && idx < lettres.length)
                ? lettres[idx].l + " — " + lettres[idx].mot
                : ex.consigne;
        }
        const activeBtn = ex.active
            ? `<button onclick="toggleExercise('${id}', false)" class="btn-sm-add" style="background:#e74c3c">⏸️ Désactiver</button>`
            : `<button onclick="toggleExercise('${id}', true)" class="btn-sm-add" style="background:#27ae60">▶️ Activer</button>`;
        return `<div class="exercise-card ${ex.active ? '' : 'ex-inactive'}">
            <div class="exercise-card-header">
                <span class="ex-type-badge">${typeIcon} ${typeLabel}</span>
                <span class="ex-status-badge ${ex.active ? 'active' : 'inactive'}">${ex.active ? "✅ Actif" : "⏸️ Inactif"}</span>
            </div>
            <div class="ex-consigne">${consigneDisplay}</div>
            <div class="ex-meta">${targetLabel} &nbsp;|&nbsp; ${deadline} &nbsp;|&nbsp; 📬 ${subsForEx.length} rendu(s)</div>
            <div class="ex-actions">
                ${activeBtn}
                <button onclick="deleteExercise('${id}')" class="btn-delete">🗑️ Supprimer</button>
            </div>
        </div>`;
    }).join("");
}

window.toggleExercise = async (id, active) => {
    const snap = await getDoc(doc(db, "exercices", id));
    if (snap.exists()) {
        await setDoc(doc(db, "exercices", id), { ...snap.data(), active });
        await loadTeacherExercises();
    }
};

window.deleteExercise = async id => {
    if (!confirm("Supprimer cet exercice ?")) return;
    await deleteDoc(doc(db, "exercices", id));
    await loadTeacherExercises();
};

// ====== LOAD SUBMISSIONS ======
async function loadSubmissions() {
    const subs = await getSubmissions();
    const exs = await getExercises();
    const mine = Object.entries(subs).filter(([, s]) => s.schoolId === currentSchoolId && s.classId === currentClassId);
    const el = document.getElementById("submissions-list");
    if (!el) return;

    // Update badge
    const newSubs = mine.filter(([, s]) => !s.seen);
    const badge = document.getElementById("submissions-badge");
    if (badge) { badge.textContent = newSubs.length; badge.classList.toggle("hidden", newSubs.length === 0); }

    if (mine.length === 0) { el.innerHTML = `<p style="color:#aaa;padding:20px;text-align:center">Aucun travail rendu</p>`; return; }

    // Group by exercise
    const grouped = {};
    mine.forEach(([id, s]) => {
        if (!grouped[s.exerciceId]) grouped[s.exerciceId] = [];
        grouped[s.exerciceId].push([id, s]);
    });

    el.innerHTML = Object.entries(grouped).map(([exId, submissions]) => {
        const ex = exs[exId];
        if (!ex) return "";
        const typeIcon = ex?.type==="letter"?"🔤":ex?.type==="word"?"📝":"✏️";
        // ✅ CORRECTION : convertir index en lettre pour type forme
        let titreEx = ex?.consigne || "Exercice supprimé";
        if (ex?.type === "forme") {
            const idx = parseInt(ex.consigne);
            titreEx = (!isNaN(idx) && idx >= 0 && idx < lettres.length)
                ? lettres[idx].l + " — " + lettres[idx].mot
                : ex.consigne;
        }
        return `<div class="submission-group">
            <h3 class="submission-group-title">${typeIcon} ${titreEx}</h3>
            <div class="submissions-grid">
                ${submissions.map(([sid, s]) => {
                    const studentName = extractStudentName(s.studentId, s.schoolId, s.classId);
                    const date = new Date(s.submittedAt).toLocaleDateString("fr-FR");
                    // ✅ Affichage adapté selon le type
                    const isFormeType = ex?.type === "forme";
                    // Pour les formes avec tatweel (ـخ, ـبـ etc.), on wrap avec une lettre
                    // neutre invisible pour que le moteur arabe rende la connexion correctement
                    const formeVal = s.selectedForme || s.answer || "؟";
                    const hasLeadingTatweel = formeVal.startsWith("\u0640"); // ـ
                    const hasTrailingTatweel = formeVal.endsWith("\u0640");
                    const ctxBefore = hasLeadingTatweel  ? `<span style="opacity:0;font-size:48px;font-family:Tajawal,Arial">ب</span>` : "";
                    const ctxAfter  = hasTrailingTatweel ? `<span style="opacity:0;font-size:48px;font-family:Tajawal,Arial">ب</span>` : "";
                    const contenu = isFormeType
                        ? `<div style="text-align:center;padding:12px 0">
                            <div style="font-size:48px;font-family:Tajawal,Arial;font-weight:900;color:#e74c3c;direction:rtl;display:inline-flex;align-items:center;gap:0">${ctxAfter}${formeVal}${ctxBefore}</div>
                            <div style="font-size:13px;color:#888;margin-top:4px">${s.correct ? "✅ صحيح" : "❌ خطأ"}</div>
                           </div>`
                        : `<img src="${s.imageData}" class="submission-img" onclick="viewSubmission('${sid}')" alt="Dessin" style="width:100%;border-radius:8px;cursor:pointer">`;
                    return `<div class="submission-card ${s.seen ? "" : "unseen"}">
                        <div class="submission-student">👦 ${studentName}</div>
                        <div class="submission-date">📅 ${date}</div>
                        ${contenu}
                        <div style="display:flex;gap:8px;margin-top:8px">
                            <button onclick="markSeen('${sid}')" class="btn-sm-add" style="flex:1;background:#27ae60">✅ Vu</button>
                            <button onclick="deleteSubmission('${sid}')" class="btn-delete" style="flex:1">🗑️</button>
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </div>`;
    }).join("");

    // Mark all as seen after viewing
    for (const [id, s] of mine) {
        if (!s.seen) await setDoc(doc(db, "soumissions", id), { ...s, seen: true });
    }
}

window.viewSubmission = id => {
    const img = document.querySelector(`[onclick="viewSubmission('${id}')"]`);
    if (img) window.open(img.src, "_blank");
};

window.markSeen = async id => {
    const snap = await getDoc(doc(db, "soumissions", id));
    if (snap.exists()) await setDoc(doc(db, "soumissions", id), { ...snap.data(), seen: true });
    await loadSubmissions();
};

window.deleteSubmission = async id => {
    if (!confirm("Supprimer ce travail ?")) return;
    await deleteDoc(doc(db, "soumissions", id));
    await loadSubmissions();
};

// ====== STUDENT SIDE - LOAD EXERCISES ======
async function loadStudentExercises() {
    const exs = await getExercises();
    const subs = await getSubmissions();
    const myExercises = Object.entries(exs).filter(([, e]) =>
        e.active &&
        e.schoolId === currentSchoolId &&
        e.classId === currentClassId &&
        (e.target === "all" || e.target === currentUser)
    );

    // Badge notification
    const mySubmittedIds = Object.values(subs).filter(s => s.studentId === currentUser).map(s => s.exerciceId);
    const pending = myExercises.filter(([id]) => !mySubmittedIds.includes(id));
    const badge = document.getElementById("exercise-badge");
    if (badge) { badge.textContent = pending.length; badge.classList.toggle("hidden", pending.length === 0); }

    const el = document.getElementById("exercises-list");
    if (!el) return;

    if (myExercises.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#aaa"><div style="font-size:60px">📋</div><p style="margin-top:15px;font-size:18px">${bi("لا توجد تمارين حالياً","noExercises")}</p><p style="font-size:14px">${bi("سيظهر هنا تمارين الأستاذ","noExercisesSub")}</p></div>`;
        return;
    }

    // Cache exercises for safe onclick access
    myExercises.forEach(([id, ex]) => { window._exercisesCache[id] = ex; });

    el.innerHTML = myExercises.sort((a,b) => b[1].createdAt.localeCompare(a[1].createdAt)).map(([id, ex]) => {
        const done = mySubmittedIds.includes(id);
        // For forme type, resolve letter from index
        let displayConsigne = ex.consigne;
        if (ex.type === "forme") {
            const idx = parseInt(ex.consigne);
            displayConsigne = (!isNaN(idx) && idx >= 0 && idx < lettres.length) 
                ? lettres[idx].l 
                : ex.consigne;
        }
        const typeIcon = ex.type==="letter"?"🔤":ex.type==="word"?"📝":ex.type==="forme"?"🔀":"✏️";
        const typeLabel = ex.type==="letter"?bi("اكتب الحرف","typeLetter"):ex.type==="word"?bi("اكتب الكلمة","typeWord"):ex.type==="forme"?bi("الأشكال","typeForme"):bi("التعليمة","typeInstruction");
        const deadline = ex.deadline ? `<span class="ex-meta-item">📅 ${new Date(ex.deadline).toLocaleDateString("fr-FR")}</span>` : "";
        // Encode type and consigne safely in data attributes
        const safeConsigne = encodeURIComponent(ex.consigne);
        return `<div class="student-exercise-card ${done ? "done" : "pending"}">
            <div class="student-ex-header">
                <span class="ex-type-badge">${typeIcon} ${typeLabel}</span>
                <span class="${done ? "badge-active" : "badge-pending"}">${done ? "✅ "+bi("أرسلت","statusSent") : "⏳ "+bi("ينتظر","statusPending")}</span>
            </div>
            <div class="student-ex-consigne">${
                ex.type === "forme" 
                    ? (() => { const idx=parseInt(ex.consigne); return (!isNaN(idx)&&idx>=0&&idx<lettres.length)?lettres[idx].l:ex.consigne; })()
                    : ex.consigne
            }</div>
            ${deadline}
            ${!done 
                ? `<button 
                    data-exid="${id}" 
                    data-type="${ex.type}" 
                    data-consigne="${safeConsigne}"
                    onclick="startExFromBtn(this)" 
                    class="btn-start-ex">✏️ ${bi("ابدأ التمرين","btnStartExercise")}</button>` 
                : `<p style="color:var(--green);font-weight:700;text-align:center;margin-top:10px">✅ ${bi("تم الإرسال للأستاذ","sentToTeacher")}</p>`
            }
        </div>`;
    }).join("");
}

// ====== OPEN EXERCISE CANVAS ======
// Cache exercises for safe access
window._exercisesCache = {};

window.startExById = (id) => {
    const ex = window._exercisesCache[id];
    if (!ex) {
        loadStudentExercises().then(() => {
            const ex2 = window._exercisesCache[id];
            if (ex2) window.openExerciseCanvas(id, ex2.consigne, ex2.type);
        });
        return;
    }
    window.openExerciseCanvas(id, ex.consigne, ex.type);
};

// New: read from data attributes - more reliable than cache
window.startExFromBtn = (btn) => {
    const exId = btn.dataset.exid;
    const type = btn.dataset.type;
    const rawConsigne = btn.dataset.consigne || "";
    let consigne = "";
    try { consigne = decodeURIComponent(rawConsigne); } 
    catch(e) { consigne = rawConsigne; }
    
    if (!exId || !type) {
        alert("Erreur: données manquantes. exId=" + exId + " type=" + type);
        return;
    }
    
    if (type === "forme") {
        // For forme type, directly call openFormeExercise
        window.openFormeExercise(exId, consigne);
        return;
    }
    
    window.openExerciseCanvas(exId, consigne, type);
};

window.openExerciseCanvas = (exId, consigne, type) => {
    // Handle forme type separately
    if (type === "forme") {
        window.openFormeExercise(exId, consigne);
        return;
    }

    currentExerciseId = exId;
    window.exColor = '#FF6B6B';
    window.exBrushSize = 8;
    window.exEraserMode = false;
    // Reset eraser button if exists
    const oldBtn = document.getElementById("ex-eraser-btn");
    if (oldBtn) { oldBtn.style.background="#f0f0f0"; oldBtn.style.borderColor="#ddd"; oldBtn.style.color="#333"; oldBtn.innerHTML="🗑️ ممحاة"; }

    // Create modal overlay
    const existing = document.getElementById("exercise-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "exercise-modal";
    modal.className = "exercise-modal";
    modal.innerHTML = `
        <div class="exercise-modal-content">
            <div class="exercise-modal-header">
                <h3>${consigne} ✏️</h3>
                <button onclick="closeExModal()" class="btn-close-modal">✕</button>
            </div>
            <!-- Toolbar couleurs -->
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:10px;flex-wrap:wrap">
                <input type="color" value="#FF6B6B" onchange="window.exColor=this.value;window.exEraserMode=false" style="width:32px;height:32px;border:none;border-radius:6px;cursor:pointer;padding:0">
                <div style="width:26px;height:26px;border-radius:50%;background:#FF6B6B;cursor:pointer;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)" onclick="window.exColor='#FF6B6B';window.exEraserMode=false;document.querySelectorAll('.ex-color-dot').forEach(d=>d.style.border='2px solid white');this.style.border='3px solid #333'"></div>
                <div style="width:26px;height:26px;border-radius:50%;background:#1a56a0;cursor:pointer;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)" onclick="window.exColor='#1a56a0';window.exEraserMode=false;document.querySelectorAll('.ex-color-dot').forEach(d=>d.style.border='2px solid white');this.style.border='3px solid #333'"></div>
                <div style="width:26px;height:26px;border-radius:50%;background:#27ae60;cursor:pointer;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)" onclick="window.exColor='#27ae60';window.exEraserMode=false;document.querySelectorAll('.ex-color-dot').forEach(d=>d.style.border='2px solid white');this.style.border='3px solid #333'"></div>
                <div style="width:26px;height:26px;border-radius:50%;background:#000;cursor:pointer;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)" onclick="window.exColor='#000000';window.exEraserMode=false;document.querySelectorAll('.ex-color-dot').forEach(d=>d.style.border='2px solid white');this.style.border='3px solid #333'"></div>
                <span style="font-size:12px;color:#888">|</span>
                <input type="range" min="2" max="25" value="8" oninput="window.exBrushSize=parseInt(this.value)" style="width:60px;accent-color:#FF6B6B">
                <button id="ex-eraser-btn" onclick="toggleExEraser(this)" style="padding:4px 12px;border:2px solid #ddd;border-radius:8px;font-size:14px;cursor:pointer;background:#f0f0f0;font-weight:700;color:#333">🗑️ ممحاة</button>
            </div>
            <div style="position:relative;width:300px;height:300px;margin:0 auto">
                <div id="ex-guide" style="position:absolute;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:180px;font-family:Tajawal,Arial;font-weight:900;color:rgba(0,0,0,0.06);pointer-events:none;user-select:none;z-index:0">${type==="letter"?consigne:""}</div>
                <canvas id="exercise-canvas" width="300" height="300" style="position:relative;z-index:1;border:2px dashed #ddd;border-radius:15px;cursor:crosshair;touch-action:none;display:block"></canvas>
            </div>
            <!-- ✅ BOUTON PRONONCIATION exercice écriture -->
            <div style="text-align:center;margin:8px 0">
                <button 
                    data-word="${encodeURIComponent(consigne)}"
                    onclick="speakArabic(decodeURIComponent(this.dataset.word))"
                    style="background:var(--primary);color:white;border:none;border-radius:50px;padding:8px 22px;font-size:18px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.15)">🔊 استمع</button>
            </div>
            <div class="exercise-canvas-controls">
                <button onclick="clearExCanvas()" class="btn-trace">🗑️ امسح</button>
                <button onclick="submitExercise('${exId}')" class="btn-done" style="flex:2">📤 أرسل للأستاذ</button>
                <button onclick="downloadExCanvas()" class="btn-audio">💾 حفظ</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // Setup canvas AFTER modal is in DOM
    requestAnimationFrame(() => {
        setupEnhancedCanvas("exercise-canvas");
    });
};

let currentExerciseId = null;
let exDrawing = false, exLastX = 0, exLastY = 0;
window.exColor = '#FF6B6B';
window.exBrushSize = 8;
window.exEraserMode = false;

function setupExCanvas() {
    const canvas = document.getElementById("exercise-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#FF6B6B"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";

    const getPos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX-r.left)*(canvas.width/r.width), y: (e.clientY-r.top)*(canvas.height/r.height) }; };
    canvas.addEventListener("mousedown", e => { exDrawing=true; const p=getPos(e); exLastX=p.x; exLastY=p.y; });
    canvas.addEventListener("mousemove", e => { if(!exDrawing)return; const p=getPos(e); ctx.strokeStyle="#FF6B6B";ctx.lineWidth=8;ctx.lineCap="round"; ctx.beginPath();ctx.moveTo(exLastX,exLastY);ctx.lineTo(p.x,p.y);ctx.stroke();exLastX=p.x;exLastY=p.y; });
    canvas.addEventListener("mouseup", ()=>exDrawing=false);
    canvas.addEventListener("mouseleave", ()=>exDrawing=false);
    canvas.addEventListener("touchstart", e=>{e.preventDefault();exDrawing=true;const p=getPos(e.touches[0]);exLastX=p.x;exLastY=p.y;},{passive:false});
    canvas.addEventListener("touchmove", e=>{e.preventDefault();if(!exDrawing)return;const p=getPos(e.touches[0]);ctx.strokeStyle="#FF6B6B";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(exLastX,exLastY);ctx.lineTo(p.x,p.y);ctx.stroke();exLastX=p.x;exLastY=p.y;},{passive:false});
    canvas.addEventListener("touchend", ()=>exDrawing=false);
}

window.toggleExEraser = (btn) => {
    window.exEraserMode = !window.exEraserMode;
    if (window.exEraserMode) {
        // Eraser is ON - show that user can switch back to drawing
        btn.style.background = "#ffe0e0";
        btn.style.borderColor = "#e74c3c";
        btn.style.color = "#e74c3c";
        btn.innerHTML = "🗑️ ممحاة ✓";
    } else {
        // Eraser is OFF - normal drawing mode
        btn.style.background = "#f0f0f0";
        btn.style.borderColor = "#ddd";
        btn.style.color = "#333";
        btn.innerHTML = "🗑️ ممحاة";
    }
};

window.clearExCanvas = () => { const c=document.getElementById("exercise-canvas"); if(c) c.getContext("2d").clearRect(0,0,c.width,c.height); };

window.downloadExCanvas = () => {
    const c = document.getElementById("exercise-canvas");
    if (!c) return;
    const a = document.createElement("a"); a.download = "exercice.png"; a.href = c.toDataURL(); a.click();
};

window.submitExercise = async exId => {
    const c = document.getElementById("exercise-canvas");
    if (!c) return;
    const imageData = c.toDataURL("image/png");
    if (imageData === "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==") {
        alert("الرسم فارغ! ارسم أولاً ثم أرسل."); return;
    }
    const subId = "sub_" + Date.now();
    await saveSubmission(subId, {
        exerciceId: exId,
        studentId: currentUser,
        schoolId: currentSchoolId,
        classId: currentClassId,
        imageData,
        submittedAt: new Date().toISOString(),
        seen: false
    });
    alert("✅ تم الإرسال للأستاذ!");
    closeExModal();
    await loadStudentExercises();
};

window.closeExModal = () => { const m=document.getElementById("exercise-modal"); if(m) m.remove(); };

// ====== PATCH switchTab to load exercises ======
// ✅ PATCH SWITCHTAB UNIFIÉ - toutes fonctions
const _origSwitchTab = window.switchTab;
window.switchTab = (name, btn) => {
    _origSwitchTab(name, btn);
    if (name === "exercises") loadStudentExercises();
    if (name === "vocab") loadVocab();
    if (name === "learn") { buildMenu(); updateProgress(); }
    if (name === "quran") { loadQuranProgress().then(() => showQuranHome()); }
    // FIX: reset quiz view when switching to ikhtebar tab
    if (name === "ikhtebar") {
        const intro = document.getElementById("quiz-intro");
        const game  = document.getElementById("quiz-game");
        const res   = document.getElementById("quiz-result");
        if (intro) intro.classList.remove("hidden");
        if (game)  game.classList.add("hidden");
        if (res)   res.classList.add("hidden");
    }
};

// ====== CHECK EXERCISES ON LOGIN (badge) ======
async function checkExerciseBadge() {
    const exs = await getExercises();
    const subs = await getSubmissions();
    const myExercises = Object.entries(exs).filter(([, e]) =>
        e.active && e.schoolId === currentSchoolId && e.classId === currentClassId &&
        (e.target === "all" || e.target === currentUser)
    );
    const mySubmittedIds = Object.values(subs).filter(s => s.studentId === currentUser).map(s => s.exerciceId);
    const pending = myExercises.filter(([id]) => !mySubmittedIds.includes(id));
    const badge = document.getElementById("exercise-badge");
    if (badge) { badge.textContent = pending.length; badge.classList.toggle("hidden", pending.length === 0); }
}

// Check badge after menu loads
async function checkAndUpdateBadge() {
    if (currentRole === "student") await checkExerciseBadge();
}

// ============================================
//  LISTE DES ÉLÈVES PAR CLASSE
// ============================================

let currentClassForStudents = null;

window.openStuPanel = async (classId, className) => {
    currentClassForStudents = classId;
    document.getElementById("sa-students-title").textContent = "👥 Élèves — " + className;
    document.getElementById("sa-students-panel").classList.remove("hidden");
    await loadStudentsList(classId);
};

window.closeStuPanel = () => {
    document.getElementById("sa-students-panel").classList.add("hidden");
    currentClassForStudents = null;
};

async function loadStudentsList(classId) {
    const snap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = snap.data();
    const cl = school?.classes?.[classId];
    const students = cl?.students || [];
    const el = document.getElementById("sa-students-list");

    if (students.length === 0) {
        el.innerHTML = `<p style="color:#aaa;text-align:center;padding:20px">Aucun élève — ajoutez-en ci-dessus</p>`;
        return;
    }

    el.innerHTML = `
        <table class="teacher-table">
            <thead><tr><th>#</th><th>👤 Prénom + Nom</th><th>⚙️</th></tr></thead>
            <tbody>
                ${students.map((name, i) => `
                    <tr>
                        <td style="color:#aaa">${i+1}</td>
                        <td><strong>${name}</strong></td>
                        <td><button onclick="saRemoveStudent('${classId}', ${i})" class="btn-delete">🗑️</button></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        <p style="color:#888;font-size:13px;margin-top:10px;text-align:center">${students.length} élève(s) inscrit(s)</p>
    `;
}

window.saAddStudent = async () => {
    if(isDemoMode){alert("🎬 Mode démo : ajout désactivé.");return;}
    const firstname = document.getElementById("stu-firstname").value.trim();
    const lastname = document.getElementById("stu-lastname").value.trim();
    if (!firstname || !lastname) { alert("Entrez prénom et nom"); return; }
    if (!currentClassForStudents) return;

    const snap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = snap.data();
    school.classes[currentClassForStudents].students = school.classes[currentClassForStudents].students || [];

    const fullName = firstname + " " + lastname;
    // Check duplicate
    if (school.classes[currentClassForStudents].students.find(s => s.toLowerCase() === fullName.toLowerCase())) {
        alert("Cet élève est déjà dans la liste !"); return;
    }

    school.classes[currentClassForStudents].students.push(fullName);
    await setDoc(doc(db, "ecoles", currentSchoolId), school);

    document.getElementById("stu-firstname").value = "";
    document.getElementById("stu-lastname").value = "";
    await loadStudentsList(currentClassForStudents);
    await saLoadClasses(school);
};

window.saRemoveStudent = async (classId, index) => {
    if (!confirm("Supprimer cet élève de la liste ?")) return;
    const snap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = snap.data();
    school.classes[classId].students.splice(index, 1);
    await setDoc(doc(db, "ecoles", currentSchoolId), school);
    await loadStudentsList(classId);
    await saLoadClasses(school);
};

window.importExcel = async () => {
    const file = document.getElementById("excel-import").files[0];
    if (!file) { alert("Choisissez un fichier Excel ou CSV"); return; }
    if (!currentClassForStudents) { alert("Ouvrez d'abord la liste d'une classe"); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let students = [];

            if (file.name.endsWith(".csv")) {
                // Parse CSV
                const text = e.target.result;
                const lines = text.split("\n").filter(l => l.trim());
                lines.forEach((line, i) => {
                    if (i === 0 && (line.toLowerCase().includes("prénom") || line.toLowerCase().includes("prenom"))) return;
                    const parts = line.split(/[,;]/).map(p => p.trim().replace(/"/g, ""));
                    if (parts.length >= 2 && parts[0] && parts[1]) {
                        students.push(parts[0] + " " + parts[1]);
                    }
                });
            } else {
                // Parse Excel
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                rows.forEach((row, i) => {
                    if (i === 0 && typeof row[0] === "string" && row[0].toLowerCase().includes("pr")) return;
                    if (row[0] && row[1]) students.push(String(row[0]).trim() + " " + String(row[1]).trim());
                });
            }

            if (students.length === 0) { alert("Aucun élève trouvé. Vérifiez le format du fichier."); return; }

            const snap = await getDoc(doc(db, "ecoles", currentSchoolId));
            const school = snap.data();
            const existing = school.classes[currentClassForStudents].students || [];

            // Add only new ones
            let added = 0;
            students.forEach(name => {
                if (!existing.find(e => e.toLowerCase() === name.toLowerCase())) {
                    existing.push(name); added++;
                }
            });
            school.classes[currentClassForStudents].students = existing;
            await setDoc(doc(db, "ecoles", currentSchoolId), school);

            alert(`✅ ${added} élève(s) importé(s) !\n${students.length - added} doublon(s) ignoré(s).`);
            document.getElementById("excel-import").value = "";
            await loadStudentsList(currentClassForStudents);
            await saLoadClasses(school);
        } catch (err) {
            alert("Erreur lors de l'import : " + err.message);
        }
    };

    if (file.name.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
};

window.resetStudentSelect = () => {
    const sel = document.getElementById("student-name-select");
    const msg = document.getElementById("student-list-msg");
    if(sel){ sel.style.display="none"; sel.innerHTML='<option value="">-- اختر اسمك --</option>'; }
    if(msg) msg.style.display="none";
    const codeInput = document.getElementById("student-code");
    if(codeInput) codeInput.value="";
};

// ============================================
//  LISTE DE CLASSE - Tableau de bord Prof
// ============================================

async function loadTeacherClassList() {
    const el = document.getElementById("teacher-classlist-content");
    if (!el) return;

    el.innerHTML = "<div style='text-align:center;padding:30px;color:#aaa'>⏳ Chargement...</div>";

    // Get class info from school
    const schoolSnap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = schoolSnap.data();
    const classData = school?.classes?.[currentClassId];
    const className = classData?.name || "Ma classe";
    const registeredStudents = classData?.students || [];

    // Update title
    const title = document.getElementById("classlist-title");
    if (title) title.textContent = "📋 " + className + " — " + registeredStudents.length + " élève(s)";

    if (registeredStudents.length === 0) {
        el.innerHTML = `
            <div style="text-align:center;padding:40px;color:#aaa">
                <div style="font-size:50px">📋</div>
                <p style="margin-top:15px;font-size:18px">Aucun élève inscrit dans cette classe</p>
                <p style="font-size:14px;margin-top:8px">Le directeur doit d'abord établir la liste des élèves</p>
            </div>`;
        return;
    }

    // Get connected students (those who have data in Firebase)
    const allStudents = await getAllStudents();
    const connectedIds = Object.keys(allStudents).filter(id =>
        id.startsWith(currentSchoolId + "_" + currentClassId + "_")
    );
    const connectedNames = connectedIds.map(id => extractStudentName(id, currentSchoolId, currentClassId).toLowerCase());

    // Build table
    const rows = registeredStudents.sort().map((name, i) => {
        const isConnected = connectedNames.includes(name.toLowerCase());
        const studentId = currentSchoolId + "_" + currentClassId + "_" + name;
        const studentData = allStudents[studentId];
        const progress = studentData ? Math.round(studentData.learned.length / lettres.length * 100) : 0;
        const lastActivity = studentData?.lastActivity
            ? new Date(studentData.lastActivity).toLocaleDateString("fr-FR")
            : "—";
        const quizCount = studentData?.quizScores?.length || 0;

        return `<tr>
            <td style="color:#aaa;font-size:13px">${i + 1}</td>
            <td><strong>${name}</strong></td>
            <td>
                <span style="background:${isConnected ? "#e8f8ec" : "#fff3e0"};color:${isConnected ? "#27ae60" : "#e67e22"};padding:4px 10px;border-radius:20px;font-size:13px;font-weight:700">
                    ${isConnected ? "✅ Connecté" : "⏳ Pas encore"}
                </span>
            </td>
            <td>
                <div class="progress-mini">
                    <div class="progress-mini-bar">
                        <div class="progress-mini-fill" style="width:${progress}%"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
            </td>
            <td style="text-align:center">${quizCount} quiz</td>
            <td style="color:#888;font-size:13px">${lastActivity}</td>
        </tr>`;
    }).join("");

    const connected = connectedNames.length;
    const total = registeredStudents.length;

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
            <div class="summary-card">
                <div class="s-num">${total}</div>
                <div class="s-label">Élèves inscrits</div>
            </div>
            <div class="summary-card">
                <div class="s-num" style="color:#27ae60">${connected}</div>
                <div class="s-label">Déjà connectés</div>
            </div>
            <div class="summary-card">
                <div class="s-num" style="color:#e67e22">${total - connected}</div>
                <div class="s-label">Pas encore connectés</div>
            </div>
        </div>
        <div class="teacher-table-wrap">
            <table class="teacher-table" id="print-classlist">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>👤 Nom complet</th>
                        <th>Statut</th>
                        <th>📊 Progression</th>
                        <th>🏆 Quiz</th>
                        <th>📅 Dernière activité</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

window.printClassList = () => {
    const schoolSnap_name = document.getElementById("classlist-title")?.textContent || "Liste de classe";
    const tableEl = document.getElementById("print-classlist");
    if (!tableEl) { alert("Aucune liste à imprimer"); return; }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${schoolSnap_name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                h2 { color: #c0392b; text-align: center; }
                h3 { color: #1a56a0; text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background: #1a56a0; color: white; padding: 10px; text-align: center; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: center; }
                tr:nth-child(even) { background: #f5f5f5; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            </style>
        </head>
        <body>
            <h2>حروفي — Application Alphabet Arabe</h2>
            <h3>${schoolSnap_name}</h3>
            ${tableEl.outerHTML}
            <div class="footer">Imprimé le ${new Date().toLocaleDateString("fr-FR")} — hourouf-app-2.netlify.app</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

// ============================================
//  TABLEAU DE TRACÉ AMÉLIORÉ
// ============================================

let traceColor = "#FF6B6B";
let brushSize = 8;
let isEraserMode = false;

window.setTraceColor = (color) => {
    traceColor = color;
    isEraserMode = false;
    document.getElementById("eraser-btn")?.classList.remove("active-tool");
    document.getElementById("trace-color").value = color;
    // Update canvas context
    const canvas = document.getElementById("trace-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
    }
};

window.setBrushSize = (size) => {
    brushSize = parseInt(size);
    document.getElementById("brush-size-label").textContent = size;
};

window.toggleEraser = () => {
    isEraserMode = !isEraserMode;
    const btn = document.getElementById("eraser-btn");
    if (isEraserMode) {
        btn?.classList.add("active-tool");
    } else {
        btn?.classList.remove("active-tool");
        window.setTraceColor(traceColor);
    }
};

// initTrace is already defined above - enhanced version patches it below

function setupEnhancedCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn("Canvas not found:", canvasId); return; }
    const isExCanvas = canvasId === "exercise-canvas";

    // Remove previous listeners by replacing only for trace canvas
    // For exercise canvas, just get context directly
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let drawing = false, lx = 0, ly = 0;

    const getPos = e => {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (canvas.width / r.width),
            y: (e.clientY - r.top) * (canvas.height / r.height)
        };
    };

    const startD = e => {
        drawing = true;
        const p = getPos(e);
        lx = p.x; ly = p.y;
    };

    const draw = e => {
        if (!drawing) return;
        const p = getPos(e);
        // Always read fresh values from window for exercise canvas
        const eraserOn = isExCanvas ? (window.exEraserMode || false) : isEraserMode;
        const color    = isExCanvas ? (window.exColor || '#FF6B6B')  : traceColor;
        const size     = isExCanvas ? (window.exBrushSize || 8)      : brushSize;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        if (eraserOn) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
        }
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lx = p.x; ly = p.y;
    };

    const stopD = () => drawing = false;

    canvas.addEventListener("mousedown", startD);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopD);
    canvas.addEventListener("mouseleave", stopD);
    canvas.addEventListener("touchstart", e => { e.preventDefault(); startD(e.touches[0]); }, { passive: false });
    canvas.addEventListener("touchmove",  e => { e.preventDefault(); draw(e.touches[0]); }, { passive: false });
    canvas.addEventListener("touchend", stopD);
}

// ===== FOND LIGNÉ TYPE CAHIER D'ÉCOLE POUR LE TRACÉ =====
let traceBgMode = "plain"; // "plain" | "lines"

function drawNotebookBg() {
    const bg = document.getElementById("trace-bg-canvas");
    if (!bg) return;
    const ctx = bg.getContext("2d");
    const w = bg.width, h = bg.height;
    ctx.clearRect(0, 0, w, h);
    // Fond blanc de base
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (traceBgMode === "lines") {
        // Petites lignes horizontales fines sur toute la hauteur (ruling fin, façon papier réglé)
        ctx.strokeStyle = "#E3EDF9";
        ctx.lineWidth = 1;
        const fineSpacing = h / 16; // beaucoup de petites lignes rapprochées
        for (let y = fineSpacing; y < h; y += fineSpacing) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Lignes guides principales, plus marquées, par-dessus les petites lignes
        ctx.strokeStyle = "#BFD7F2";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        [0.25, 0.5].forEach(f => {
            ctx.beginPath(); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); ctx.stroke();
        });
        // Ligne de base principale (pleine, plus marquée) — comme la ligne d'écriture d'un cahier
        ctx.setLineDash([]);
        ctx.strokeStyle = "#8FB8E8";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.lineTo(w, h * 0.75); ctx.stroke();
    }
}

window.toggleTraceBg = () => {
    traceBgMode = traceBgMode === "plain" ? "lines" : "plain";
    const btn = document.getElementById("trace-bg-toggle");
    if (btn) btn.textContent = traceBgMode === "lines" ? bi("⬜ خلفية بيضاء","whiteBg") : bi("📝 خطوط الكراسة","notebookLines");
    drawNotebookBg();
};

// Override clearCanvas
window.clearCanvas = () => {
    const c = document.getElementById("trace-canvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
};

// ============================================
//  EXERCICE FORMES — GLISSER-DÉPOSER
// ============================================

window.openFormeExercise = (exId, letterChar) => {
    // ✅ CORRECTION : si letterChar est un index numérique, le convertir en lettre arabe
    const numIdx = parseInt(letterChar);
    if (!isNaN(numIdx) && numIdx >= 0 && numIdx < lettres.length && /^\d+$/.test(String(letterChar).trim())) {
        letterChar = lettres[numIdx].l;
    }

    // Try exact match first
    let letter = lettres.find(l => l.l === letterChar);
    
    if (!letter) {
        // Try stripping diacritics
        const base = letterChar.replace(/[ً-ٰٟ]/g,'').trim();
        letter = lettres.find(l => l.l.replace(/[ً-ٰٟ]/g,'').trim() === base);
    }
    
    if (!letter) {
        // Try matching just first character
        const firstChar = [...letterChar][0];
        letter = lettres.find(l => [...l.l][0] === firstChar);
    }

    if (!letter) {
        alert("الحرف غير موجود: [" + letterChar + "] (length=" + letterChar.length + ")");
        return;
    }

    const existing = document.getElementById("exercise-modal");
    if (existing) existing.remove();

    const posNames = ["أول الكلمة", "وسط الكلمة", "آخر الكلمة مربوطة", "آخر الكلمة مطلقة"];

    // Chercher les données de formes
    const letterBase = letterChar.replace(/[ً-ٰٟ]/g,"").trim();
    const formesData = formesMots[letterChar] || formesMots[letterBase] || formesMots[letter.l];

    // Nombre de positions disponibles
    // Pour les lettres non-connectantes (ا د ذ ر ز و) : seulement 2 formes réelles
    // On détecte via letter.formes.length (2 = non-connectante, 3 = connectante)
    const maxPos = letter.formes.length <= 2 ? 2 : (formesData ? formesData.formes.length : letter.formes.length);
    const nbPos = Math.min(maxPos, formesData ? formesData.formes.length : letter.formes.length);
    const correctPos = Math.floor(Math.random() * nbPos);

    const wordStr = formesData ? (formesData.mots[correctPos] || letter.mot) : letter.mot;
    // Prioritize formesData (voweled, position-accurate) over generic letter.formes
    const correctFormeVowel = formesData
        ? formesData.formes[correctPos]
        : letter.formes[Math.min(correctPos, letter.formes.length - 1)];

    // Toutes les formes disponibles pour les choix
    const formesWithVowelsAll = formesData ? formesData.formes : letter.formes;

    window._selectedForme = null;
    window._correctForme = correctFormeVowel;
    window._correctFormePos = correctPos;  // pour le feedback explicatif
    window._exId = exId;

    // Use voweled formes if available
    const formesWithVowels = formesWithVowelsAll;
    // Shuffle formes
    const shuffled = [...formesWithVowels].sort(() => Math.random() - 0.5);

    const modal = document.createElement("div");
    modal.id = "exercise-modal";
    modal.className = "exercise-modal";
    modal.innerHTML = `
        <div class="exercise-modal-content" style="max-width:400px">
            <div class="exercise-modal-header">
                <h3 style="color:var(--primary)">🔀 ضع الشكل الصحيح</h3>
                <button onclick="closeExModal()" class="btn-close-modal">✕</button>
            </div>

            <p style="text-align:center;color:#888;font-size:15px;margin-bottom:10px">
                الحرف : <strong style="color:var(--primary);font-size:22px">${letterChar}</strong>
                &nbsp;|&nbsp; <strong style="
                    color:white;
                    background:${POS_COLORS[correctPos]?.border || 'var(--secondary)'};
                    padding:3px 12px;
                    border-radius:20px;
                    font-size:14px;
                    display:inline-block">
                    ${POS_COLORS[correctPos]?.emoji || ''} ${posNames[correctPos]}
                </strong>
            </p>

            <!-- WORD WITH BLANK - displayed as RTL arabic text with □ -->
            <div style="text-align:center;background:#f8f8f8;border-radius:20px;padding:20px 15px;margin:10px 0;direction:rtl">
                <div id="forme-word-display" style="font-size:44px;font-weight:900;font-family:Tajawal,Arial;color:var(--text);letter-spacing:2px;line-height:1.4">
                    ${buildWordWithBlank(wordStr, correctFormeVowel, correctPos, letterBase)}
                </div>
                <button 
                    data-word="${encodeURIComponent(wordStr)}"
                    onclick="speakArabic(decodeURIComponent(this.dataset.word))"
                    style="margin-top:10px;background:var(--primary);color:white;border:none;border-radius:50px;padding:8px 22px;font-size:18px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.15)">
                    🔊 استمع
                </button>
            </div>

            <!-- INSTRUCTION -->
            <p style="text-align:center;color:var(--text-light);font-size:14px;margin:10px 0">
                1️⃣ اختر الشكل الصحيح &nbsp; 2️⃣ اضغط على المربع
            </p>

            <!-- FORME CHOICES - Images PNG -->
            <div class="forme-choices" id="forme-choices-ex" style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px">
                ${shuffled.map((f, fi) => {
                    const posIdx = formesWithVowelsAll.indexOf(f);
                    const isNonConnecting = letter.formes.length <= 2;
                    // Lettres non-connectantes : le générateur PNG n'a que 2 fichiers (debut/fin)
                    const posNames = isNonConnecting
                        ? ["debut","fin","fin","fin"]
                        : ["debut","mediane","fin_liee","fin_libre"];
                    const posName = posIdx >= 0 && posIdx < posNames.length ? posNames[posIdx] : "debut";
                    const letterNom = LETTER_NOM_MAP[letter.l] || null;
                    const imagePath = letterNom ? `images/formes/${letterNom}_${posName}.png` : null;

                    // Couleur selon la position de cette forme
                    const posColor = POS_COLORS[posIdx] || POS_COLORS[0];
                    const borderCol = posColor.border;
                    const bgCol     = posColor.bg;
                    const posLabel  = posColor.label;

                    return `
                    <div class="forme-chip forme-chip-img"
                        data-forme="${encodeURIComponent(f)}"
                        data-pos-idx="${posIdx}"
                        id="fc-${fi}"
                        onclick="selectFormeFromEl(this)"
                        style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                               width:110px;height:120px;
                               border:3px solid ${borderCol};
                               border-radius:14px;
                               background:${bgCol};
                               cursor:pointer;transition:all 0.2s;overflow:hidden;flex-shrink:0;
                               box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                        <div style="flex:1;display:flex;align-items:center;justify-content:center;width:100%">
                        ${imagePath
                            ? `<img src="${imagePath}" alt="forme" style="max-width:90%;max-height:80px;object-fit:contain;display:block" onerror="this.outerHTML='<span style=font-size:32px;font-family:Tajawal,Arial>${f}<\/span>'" />`
                            : `<span style="font-size:32px;font-family:Tajawal,Arial">${f}</span>`
                        }
                        </div>
                        <div style="font-size:11px;font-weight:700;color:${borderCol};
                                    padding:3px 0 5px;font-family:Tajawal,Arial;
                                    border-top:1px solid ${borderCol}33;width:100%;text-align:center">
                            ${posLabel}
                        </div>
                    </div>`;
                }).join("")}
            </div>

            <div id="forme-result" style="display:none;text-align:center;padding:15px;border-radius:15px;margin-top:10px"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Make blank slot clickable
    setTimeout(() => {
        const slot = document.getElementById("forme-slot");
        if (slot) slot.onclick = () => placeSelectedForme();
    }, 100);
};

// Regroupe chaque lettre arabe avec ses diacritiques (تشكيل) pour ne pas les compter séparément
function splitArabicClusters(word) {
    return word.match(/[^\u064B-\u065F\u0670][\u064B-\u065F\u0670]*/g) || [...word];
}
// Normalise les variantes de hamza pour la recherche (أ/إ/آ/ء → ا)
function normalizeArabicBase(ch) {
    return ch.replace(/[أإآء]/g, "ا");
}

function buildWordWithBlank(word, correctForme, correctPos, letterBase) {
    // ⚠️ On regroupe lettre+diacritique en un seul "cluster" avant de chercher,
    // sinon une voyelle (fatha, kasra...) peut être comptée comme un caractère
    // à part entière et décaler le trou sur la mauvaise lettre.
    const chars = splitArabicClusters(word);
    const len = chars.length;
    let blankIdx;

    // 1) Chercher la vraie position de la lettre demandée dans le mot
    const targetBase = letterBase ? normalizeArabicBase(letterBase) : null;
    const matches = targetBase
        ? chars.reduce((acc, c, i) => {
            const base = normalizeArabicBase(c.replace(/[\u064B-\u065F\u0670]/g, ""));
            if (base === targetBase) acc.push(i);
            return acc;
        }, [])
        : [];

    if (matches.length === 1) {
        // Une seule occurrence : aucune ambiguïté possible
        blankIdx = matches[0];
    } else if (matches.length > 1) {
        // Plusieurs occurrences : choisir celle qui correspond à la position demandée
        if (correctPos === 0) blankIdx = matches[0];
        else if (correctPos >= 2) blankIdx = matches[matches.length - 1];
        else blankIdx = matches[Math.floor(matches.length / 2)];
    } else {
        // 2) Repli : ancienne méthode par position générique (si la lettre n'a pas été retrouvée)
        if (correctPos === 0) blankIdx = 0;
        else if (correctPos === 1) blankIdx = len > 2 ? Math.floor(len / 2) : 1;
        else blankIdx = len - 1;
    }

    return chars.map((ch, i) => {
        if (i === blankIdx) {
            return `<span id="forme-slot" onclick="placeSelectedForme()" 
                style="display:inline-flex;align-items:center;justify-content:center;
                min-width:55px;height:65px;border:3px dashed var(--secondary);
                border-radius:12px;background:white;color:var(--secondary);
                font-size:44px;cursor:pointer;transition:all 0.2s;
                vertical-align:middle;margin:0 3px;padding:0 4px"
                title="اضغط هنا بعد اختيار الشكل">□</span>`;
        }
        return `<span style="vertical-align:middle;font-size:44px;font-weight:900;font-family:Tajawal,Arial">${ch}</span>`;
    }).join("");
}

// ✅ NOUVELLE FONCTION : lit la forme depuis data-attribute pour éviter les problèmes de caractères arabes
window.selectFormeFromEl = (el) => {
    const forme = decodeURIComponent(el.dataset.forme || "");
    if (!forme) return;
    window.selectForme(el, forme);
};

window.selectForme = (el, forme) => {
    // Deselect all
    document.querySelectorAll(".forme-chip").forEach(c => {
        c.style.background = "white";
        c.style.borderColor = "var(--purple)";
        c.style.transform = "scale(1)";
    });
    // Select this one
    el.style.background = "#f0eeff";
    el.style.borderColor = "var(--primary)";
    el.style.transform = "scale(1.1)";
    window._selectedForme = forme;
    // Marquer ce chip comme sélectionné (pour le feedback)
    document.querySelectorAll(".forme-chip").forEach(c => c.classList.remove("selected-chip"));
    if (el) el.classList.add("selected-chip");
    
    // Show hint
    const slot = document.getElementById("forme-slot");
    if (slot) {
        slot.style.borderColor = "var(--primary)";
        slot.style.animation = "pulse 0.5s";
    }
};

window.placeSelectedForme = async () => {
    if (!window._selectedForme) {
        const resultEl = document.getElementById("forme-result");
        resultEl.style.display = "block";
        resultEl.style.background = "#fff8e0";
        resultEl.style.color = "#e67e22";
        resultEl.innerHTML = "⚠️ اختر شكلاً أولاً ثم اضغط على المربع";
        setTimeout(() => resultEl.style.display = "none", 1500);
        return;
    }
    await checkFormeAnswerInWord(window._selectedForme, window._correctForme, window._exId, document.getElementById("forme-slot"));
    window._selectedForme = null;
};

// Drag events
window.dragForme = (event, forme) => {
    event.dataTransfer.setData("forme", forme);
};

let touchedForme = null;

window.touchStartForme = (event, el, forme) => {
    touchedForme = forme;
    el.classList.add("dragging");
};

window.touchMoveForme = (event) => {
    event.preventDefault();
};

window.touchEndForme = async (event, correctForme, exId) => {
    document.querySelectorAll(".forme-chip").forEach(c => c.classList.remove("dragging"));
    if (!touchedForme) return;
    await checkFormeAnswer(touchedForme, correctForme, exId);
    touchedForme = null;
};

window.dropForme = async (event, correctForme, exId) => {
    event.preventDefault();
    const dropped = event.dataTransfer.getData("forme");
    await checkFormeAnswer(dropped, correctForme, exId);
};

window.dropFormeInWord = async (event, correctForme, exId, slotEl) => {
    event.preventDefault();
    if (slotEl) slotEl.style.background = "";
    const dropped = event.dataTransfer.getData("forme");
    await checkFormeAnswerInWord(dropped, correctForme, exId, slotEl);
};

window.touchEndFormeInWord = async (event, correctForme, exId, slotEl) => {
    document.querySelectorAll(".forme-chip").forEach(c => c.classList.remove("dragging"));
    if (!touchedForme) return;
    await checkFormeAnswerInWord(touchedForme, correctForme, exId, slotEl);
    touchedForme = null;
};

async function checkFormeAnswerInWord(dropped, correctForme, exId, slotEl) {
    const resultEl = document.getElementById("forme-result");
    if (!resultEl) return;

    if (dropped === correctForme) {
        if (slotEl) {
            slotEl.innerHTML = dropped;
            slotEl.style.background = "#e8f8ec";
            slotEl.style.borderStyle = "solid";
            slotEl.style.borderColor = "var(--green)";
            slotEl.style.color = "var(--green)";
            slotEl.style.cursor = "default";
            slotEl.onclick = null;
        }
        // Disable chips
        document.querySelectorAll(".forme-chip").forEach(c => { c.onclick = null; c.style.opacity = "0.5"; });

        // Messages de félicitation variés
        const bravo = ["🌟 ممتاز!", "✅ أحسنت! 🎉", "🏆 رائع جداً!", "⭐ صحيح تماماً!", "👏 أحسنت!"];
        const bravoMsg = bravo[Math.floor(Math.random() * bravo.length)];

        // Trouver le nom de la position correcte
        const posIdx = window._correctFormePos ?? -1;
        const posNamesAr = ["أول الكلمة", "وسط الكلمة", "آخر الكلمة مربوط", "آخر الكلمة مطلق"];
        const posNamesFr = ["début du mot", "milieu du mot", "fin liée", "fin libre"];
        const posNamesNl = ["begin van het woord", "midden van het woord", "verbonden einde", "vrij einde"];
        const posColor   = POS_COLORS[posIdx] || { border: "var(--green)", bg: "#e8f8ec" };

        resultEl.style.display = "block";
        resultEl.style.background = "#e8f8ec";
        resultEl.style.color = "var(--green)";
        resultEl.innerHTML = `
            <div style="font-size:22px;font-weight:900;margin-bottom:6px">${bravoMsg}</div>
            ${posIdx >= 0 ? `
            <div style="font-size:14px;color:#555;font-family:Tajawal,Arial;direction:rtl;margin-top:4px">
                الحرف في <strong style="color:${posColor.border}">${posNamesAr[posIdx]}</strong>
                يأخذ الشكل
                <strong style="font-size:18px;color:${posColor.border}">${correctForme}</strong>
            </div>
            <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.8">
                🇫🇷 En <strong>${posNamesFr[posIdx] || ""}</strong>, la lettre prend cette forme.<br>
                🇳🇱 In het <strong>${posNamesNl[posIdx] || ""}</strong> krijgt de letter deze vorm.
            </div>` : ""}
        `;

        const subId = "sub_" + Date.now();
        await saveSubmission(subId, {
            exerciceId: exId,
            studentId: currentUser,
            schoolId: currentSchoolId,
            classId: currentClassId,
            imageData: "forme_correct",
            selectedForme: dropped,
            correctForme: correctForme,
            correct: true,
            result: "correct",
            submittedAt: new Date().toISOString(),
            seen: false
        });

        setTimeout(async () => {
            closeExModal();
            await loadStudentExercises();
        }, 3000);

    } else {
        if (slotEl) {
            slotEl.style.background = "#fff0f0";
            slotEl.style.borderColor = "var(--primary)";
            setTimeout(() => {
                slotEl.style.background = "white";
                slotEl.style.borderColor = "var(--secondary)";
                slotEl.style.borderStyle = "dashed";
            }, 800);
        }
        // Deselect chip
        document.querySelectorAll(".forme-chip").forEach(c => {
            c.style.background = "white";
            c.style.borderColor = "var(--purple)";
            c.style.transform = "scale(1)";
        });
        window._selectedForme = null;

        // Message d'erreur explicatif selon la position correcte
        const posIdx = window._correctFormePos ?? -1;
        const posNamesAr = ["أول الكلمة", "وسط الكلمة", "آخر الكلمة مربوط", "آخر الكلمة مطلق"];
        const posNamesFr = ["début du mot", "milieu du mot", "fin liée", "fin libre"];
        const posNamesNl = ["begin van het woord", "midden van het woord", "verbonden einde", "vrij einde"];
        const posColor   = POS_COLORS[posIdx] || { border: "#e74c3c", bg: "#fff0f0" };

        // Trouver quelle position l'élève a choisie
        const selectedChip = document.querySelector(".forme-chip.selected-chip");
        const selectedPosIdx = selectedChip ? parseInt(selectedChip.dataset.posIdx ?? "-1") : -1;
        const selectedPosAr  = posNamesAr[selectedPosIdx] ?? "غير معروف";
        const selectedPosFr  = posNamesFr[selectedPosIdx] ?? "";
        const selectedPosNl  = posNamesNl[selectedPosIdx] ?? "";

        resultEl.style.display = "block";
        resultEl.style.background = "#fff0f0";
        resultEl.style.color = "#c0392b";
        resultEl.innerHTML = `
            <div style="font-size:20px;font-weight:900;margin-bottom:6px">❌ خطأ! حاول مرة أخرى</div>
            ${posIdx >= 0 ? `
            <div style="font-size:14px;font-family:Tajawal,Arial;direction:rtl;color:#555;margin-top:4px;line-height:1.6">
                الحرف في
                <strong style="color:${posColor.border}">${posNamesAr[posIdx]}</strong>
                — يجب اختيار الشكل المناسب لهذه الموضع
                ${selectedPosIdx >= 0 && selectedPosIdx !== posIdx ? `
                <br><span style="font-size:12px;color:#888">
                    اخترت شكل "${selectedPosAr}" ولكن الصحيح هو شكل "${posNamesAr[posIdx]}"
                </span>` : ""}
            </div>
            <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.8">
                🇫🇷 La lettre est en <strong>${posNamesFr[posIdx] || ""}</strong>
                ${selectedPosIdx >= 0 && selectedPosIdx !== posIdx ? `— pas en <em>${selectedPosFr}</em>` : ""} !<br>
                🇳🇱 De letter staat aan het <strong>${posNamesNl[posIdx] || ""}</strong>
                ${selectedPosIdx >= 0 && selectedPosIdx !== posIdx ? `— niet het <em>${selectedPosNl}</em>` : ""} !
            </div>` : ""}
        `;

        // Masquer après 3 secondes (plus long pour lire l'explication)
        setTimeout(() => { resultEl.style.display = "none"; }, 3500);
    }
}

async function checkFormeAnswer(dropped, correctForme, exId) {
    const resultEl = document.getElementById("forme-result");
    const dropZone = document.getElementById("drop-zone");

    if (dropped === correctForme) {
        dropZone.innerHTML = `<span style="font-size:36px;color:var(--green)">${dropped}</span>`;
        dropZone.style.borderColor = "var(--green)";
        dropZone.style.background = "#e8f8ec";
        resultEl.style.display = "block";
        resultEl.style.background = "#e8f8ec";
        resultEl.style.color = "var(--green)";
        resultEl.innerHTML = "✅ أحسنت! الجواب صحيح!";

        // Save submission
        const subId = "sub_" + Date.now();
        await saveSubmission(subId, {
            exerciceId: exId,
            studentId: currentUser,
            schoolId: currentSchoolId,
            classId: currentClassId,
            imageData: "forme_correct",
            result: "correct",
            submittedAt: new Date().toISOString(),
            seen: false
        });

        setTimeout(async () => {
            closeExModal();
            await loadStudentExercises();
        }, 1500);
    } else {
        dropZone.style.borderColor = "var(--primary)";
        dropZone.style.background = "#fff0f0";
        resultEl.style.display = "block";
        resultEl.style.background = "#fff0f0";
        resultEl.style.color = "var(--primary)";
        resultEl.innerHTML = "❌ حاول مرة أخرى!";
        setTimeout(() => {
            dropZone.innerHTML = '<span class="drop-placeholder">?</span>';
            dropZone.style.borderColor = "";
            dropZone.style.background = "";
            resultEl.style.display = "none";
        }, 1000);
    }
}

// forme type handled inside openExerciseCanvas

// ============================================
//  GESTION DES ABSENCES
// ============================================

// Firebase helpers for absences
const saveAbsence   = async (id, data) => setDoc(doc(db, "absences", id), data);
const getAbsences   = async () => { const s = await getDocs(collection(db, "absences")); const r = {}; s.forEach(d => r[d.id] = d.data()); return r; };
const deleteAbsence = async (id) => deleteDoc(doc(db, "absences", id));

// ====== PROF - INIT ATTENDANCE TAB ======
function initAttendanceTab() {
    // Set today's date by default
    const dateInput = document.getElementById("attendance-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    loadAttendance();
    loadAttendanceHistory();
}

// ====== PROF - LOAD ATTENDANCE FORM ======
window.loadAttendance = async () => {
    const dateInput = document.getElementById("attendance-date");
    const date = dateInput?.value;
    if (!date) { alert("Choisissez une date"); return; }

    const el = document.getElementById("attendance-form");
    el.innerHTML = "<div style='text-align:center;padding:20px;color:#aaa'>⏳ Chargement...</div>";

    // Get class students
    const schoolSnap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = schoolSnap.data();
    const classData = school?.classes?.[currentClassId];
    const students = classData?.students || [];

    if (students.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:30px;color:#aaa">
            <p>Aucun élève dans cette classe</p>
            <p style="font-size:13px">Le directeur doit d'abord ajouter des élèves</p>
        </div>`;
        return;
    }

    // Check existing attendance for this date
    const allAbsences = await getAbsences();
    const todayKey = `${currentSchoolId}_${currentClassId}_${date}`;
    const existing = Object.entries(allAbsences)
        .filter(([id]) => id.startsWith(todayKey))
        .reduce((acc, [id, data]) => { acc[data.studentName] = data.status; return acc; }, {});

    const dateFormatted = new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    el.innerHTML = `
        <div style="background:white;border-radius:var(--radius);padding:20px;box-shadow:var(--shadow-sm)">
            <p style="text-align:center;color:var(--text-light);margin-bottom:20px;font-size:15px">
                📅 ${dateFormatted} — ${classData?.name || "Ma classe"}
            </p>
            <div id="attendance-rows">
                ${students.sort().map((name, i) => {
                    const status = existing[name] || "present";
                    return `<div class="attendance-row" id="row-${i}">
                        <span class="attendance-name">${i+1}. ${name}</span>
                        <div class="attendance-btns">
                            <button class="att-btn present ${status==='present'?'active':''}"
                                onclick="setStatus(${i}, 'present', '${name.replace(/'/g,"\\'")}')">✅ حاضر</button>
                            <button class="att-btn absent ${status==='absent'?'active':''}"
                                onclick="setStatus(${i}, 'absent', '${name.replace(/'/g,"\\'")}')">❌ غائب</button>
                        </div>
                    </div>`;
                }).join("")}
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:center">
                <button onclick="saveAttendance('${date}')" class="btn-admin-add" style="flex:2">
                    💾 حفظ الغياب
                </button>
                <button onclick="markAllPresent()" class="btn-sm-add" style="background:var(--green)">
                    ✅ الكل حاضر
                </button>
            </div>
        </div>
    `;
};

// Store temp attendance state
let tempAttendance = {};

window.setStatus = (index, status, name) => {
    tempAttendance[name] = status;
    const row = document.getElementById("row-" + index);
    if (!row) return;
    row.querySelectorAll(".att-btn").forEach(b => b.classList.remove("active"));
    row.querySelector(".att-btn." + status).classList.add("active");
};

window.markAllPresent = () => {
    document.querySelectorAll(".att-btn.present").forEach(btn => {
        btn.classList.add("active");
        btn.closest(".attendance-row")?.querySelector(".att-btn.absent")?.classList.remove("active");
    });
    // Update tempAttendance
    document.querySelectorAll(".attendance-row").forEach(row => {
        const nameEl = row.querySelector(".attendance-name");
        if (nameEl) {
            const name = nameEl.textContent.replace(/^\d+\.\s/, "").trim();
            tempAttendance[name] = "present";
        }
    });
};

window.saveAttendance = async (date) => {
    // Collect current state from UI
    const rows = document.querySelectorAll(".attendance-row");
    const attendance = {};
    rows.forEach(row => {
        const nameEl = row.querySelector(".attendance-name");
        const activeBtn = row.querySelector(".att-btn.active");
        if (nameEl && activeBtn) {
            const name = nameEl.textContent.replace(/^\d+\.\s/, "").trim();
            attendance[name] = activeBtn.classList.contains("present") ? "present" : "absent";
        }
    });

    // Delete old records for this date first
    const allAbsences = await getAbsences();
    const todayKey = `${currentSchoolId}_${currentClassId}_${date}`;
    for (const [id] of Object.entries(allAbsences).filter(([id]) => id.startsWith(todayKey))) {
        await deleteAbsence(id);
    }

    // Save new records
    for (const [name, status] of Object.entries(attendance)) {
        const id = `${currentSchoolId}_${currentClassId}_${date}_${name.replace(/\s/g,"_")}`;
        await saveAbsence(id, {
            studentName: name,
            status,
            date,
            schoolId: currentSchoolId,
            classId: currentClassId,
            teacherId: currentUser,
            savedAt: new Date().toISOString()
        });
    }

    const absentCount = Object.values(attendance).filter(s => s === "absent").length;
    alert(`✅ Appel sauvegardé !\n❌ ${absentCount} absent(s) sur ${Object.keys(attendance).length} élèves`);
    tempAttendance = {};
    await loadAttendanceHistory();
};

// ====== PROF - ATTENDANCE HISTORY ======
async function loadAttendanceHistory() {
    const el = document.getElementById("attendance-history");
    if (!el) return;

    const allAbsences = await getAbsences();
    const mine = Object.entries(allAbsences)
        .filter(([, d]) => d.schoolId === currentSchoolId && d.classId === currentClassId);

    if (mine.length === 0) { el.innerHTML = ""; return; }

    // Group by date
    const byDate = {};
    mine.forEach(([, d]) => {
        if (!byDate[d.date]) byDate[d.date] = [];
        byDate[d.date].push(d);
    });

    const sortedDates = Object.keys(byDate).sort().reverse().slice(0, 10);

    el.innerHTML = `
        <h3 style="color:var(--text);margin-bottom:12px;font-size:18px">📋 Historique récent</h3>
        ${sortedDates.map(date => {
            const records = byDate[date];
            const absent = records.filter(r => r.status === "absent");
            const total = records.length;
            const dateFormatted = new Date(date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
            return `<div class="history-row" onclick="showDateDetails('${date}')">
                <span class="history-date">📅 ${dateFormatted}</span>
                <span class="history-stats">
                    <span style="color:var(--green)">✅ ${total - absent.length}</span>
                    <span style="color:var(--primary);margin-right:8px">❌ ${absent.length}</span>
                </span>
                ${absent.length > 0 ? `<div class="history-absent">${absent.map(a => a.studentName).join(" • ")}</div>` : ""}
            </div>`;
        }).join("")}
    `;
}

window.showDateDetails = async (date) => {
    const allAbsences = await getAbsences();
    const records = Object.values(allAbsences)
        .filter(d => d.schoolId === currentSchoolId && d.classId === currentClassId && d.date === date);
    const absent = records.filter(r => r.status === "absent");
    const dateFormatted = new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (absent.length === 0) {
        alert(`📅 ${dateFormatted}\n\n✅ Tous les élèves étaient présents !`);
    } else {
        alert(`📅 ${dateFormatted}\n\n❌ Absents (${absent.length}) :\n${absent.map(a => "• " + a.studentName).join("\n")}`);
    }
};

// ====== DIRECTEUR - INIT ABSENCES ======
async function initDirectorAbsences() {
    // Set current month
    const monthInput = document.getElementById("sa-absence-month");
    if (monthInput && !monthInput.value) {
        monthInput.value = new Date().toISOString().slice(0, 7);
    }
    // Populate class filter
    const sel = document.getElementById("sa-absence-class-filter");
    if (sel) {
        sel.innerHTML = '<option value="all">📚 Toutes les classes</option>';
        const snap = await getDoc(doc(db, "ecoles", currentSchoolId));
        const school = snap.data();
        if (school?.classes) {
            Object.entries(school.classes).forEach(([id, cl]) => {
                sel.innerHTML += `<option value="${id}">${cl.name}</option>`;
            });
        }
    }
    await loadDirectorAbsences();
}

window.loadDirectorAbsences = async () => {
    const el = document.getElementById("director-absences-content");
    if (!el) return;
    el.innerHTML = "<div style='text-align:center;padding:20px;color:#aaa'>⏳ Chargement...</div>";

    const classFilter = document.getElementById("sa-absence-class-filter")?.value || "all";
    const month = document.getElementById("sa-absence-month")?.value || new Date().toISOString().slice(0, 7);

    const allAbsences = await getAbsences();
    const schoolSnap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = schoolSnap.data();

    // Filter by school + month + class
    let records = Object.values(allAbsences).filter(d =>
        d.schoolId === currentSchoolId &&
        d.date?.startsWith(month) &&
        (classFilter === "all" || d.classId === classFilter)
    );

    if (records.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:30px;color:#aaa">
            <div style="font-size:50px">📅</div>
            <p style="margin-top:10px">Aucune absence enregistrée pour cette période</p>
        </div>`;
        return;
    }

    // Summary stats
    const totalAbsences = records.filter(r => r.status === "absent").length;
    const uniqueStudents = [...new Set(records.map(r => r.studentName))].length;
    const uniqueDates = [...new Set(records.map(r => r.date))].length;

    // Group by student
    const byStudent = {};
    records.forEach(r => {
        if (!byStudent[r.studentName]) byStudent[r.studentName] = { classId: r.classId, absences: [], presents: 0 };
        if (r.status === "absent") byStudent[r.studentName].absences.push(r.date);
        else byStudent[r.studentName].presents++;
    });

    const classNames = school?.classes || {};

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px">
            <div class="summary-card"><div class="s-num">${uniqueDates}</div><div class="s-label">Jours de cours</div></div>
            <div class="summary-card"><div class="s-num">${uniqueStudents}</div><div class="s-label">Élèves concernés</div></div>
            <div class="summary-card"><div class="s-num" style="color:var(--primary)">${totalAbsences}</div><div class="s-label">Total absences</div></div>
        </div>
        <div class="teacher-table-wrap">
            <table class="teacher-table">
                <thead>
                    <tr>
                        <th>👤 Élève</th>
                        <th>📚 Classe</th>
                        <th>❌ Nb absences</th>
                        <th>📅 Dates des absences</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(byStudent)
                        .sort((a,b) => b[1].absences.length - a[1].absences.length)
                        .map(([name, data]) => `
                        <tr>
                            <td><strong>${name}</strong></td>
                            <td>${classNames[data.classId]?.name || "?"}</td>
                            <td>
                                <span style="background:${data.absences.length > 3 ? '#fff0f0' : '#fff8e0'};
                                    color:${data.absences.length > 3 ? 'var(--primary)' : '#e67e22'};
                                    padding:4px 12px;border-radius:20px;font-weight:700;font-size:14px">
                                    ${data.absences.length} absence(s)
                                </span>
                            </td>
                            <td style="font-size:13px;color:#888;direction:ltr">
                                ${data.absences.map(d => new Date(d).toLocaleDateString("fr-FR", {day:"numeric",month:"short"})).join(", ")}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
};

window.exportAbsences = async () => {
    const month = document.getElementById("sa-absence-month")?.value || new Date().toISOString().slice(0, 7);
    const allAbsences = await getAbsences();
    const schoolSnap = await getDoc(doc(db, "ecoles", currentSchoolId));
    const school = schoolSnap.data();

    const records = Object.values(allAbsences).filter(d =>
        d.schoolId === currentSchoolId && d.date?.startsWith(month) && d.status === "absent"
    );

    const BOM = "\uFEFF";
    const rows = [["Élève", "Classe", "Date", "Statut"]];
    records.sort((a,b) => a.date.localeCompare(b.date)).forEach(r => {
        const cls = school?.classes?.[r.classId]?.name || "?";
        rows.push([r.studentName, cls, new Date(r.date).toLocaleDateString("fr-FR"), "Absent"]);
    });

    const csv = BOM + rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absences_${month}.csv`;
    a.click();
};

// ============================================
//  GRAPHIQUES VISUELS - Chart.js
// ============================================

// Store chart instances to destroy before redraw
const chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

const chartColors = [
    '#FF6B6B','#4ECDC4','#A29BFE','#fd79a8','#FDCB6E',
    '#6BCB77','#74b9ff','#ff7675','#a29bfe','#55efc4'
];

// ====== PROF : Barres progression élèves ======
function drawStudentsBarChart(students) {
    destroyChart('chart-students-bar');
    const canvas = document.getElementById('chart-students-bar');
    if (!canvas || students.length === 0) return;

    const labels = students.map(([id, d]) => extractStudentName(id, d.schoolId, d.classId).substring(0, 12));
    const data   = students.map(([,d]) => Math.round(d.learned.length / lettres.length * 100));
    const colors = data.map(v => v >= 80 ? '#6BCB77' : v >= 50 ? '#FDCB6E' : '#FF6B6B');

    chartInstances['chart-students-bar'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Progression (%)',
                data,
                backgroundColor: colors,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: ctx => `${ctx.parsed.y}% des lettres apprises` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true, max: 100,
                    ticks: { callback: v => v + '%' },
                    grid: { color: '#f0f0f0' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ====== PROF : Donut état de la classe ======
function drawClassDonutChart(students, avg) {
    destroyChart('chart-class-donut');
    const canvas = document.getElementById('chart-class-donut');
    if (!canvas) return;

    const finished  = students.filter(([,d]) => d.learned.length === lettres.length).length;
    const inProgress= students.filter(([,d]) => d.learned.length > 0 && d.learned.length < lettres.length).length;
    const notStarted= students.filter(([,d]) => d.learned.length === 0).length;

    chartInstances['chart-class-donut'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['✅ Terminé', '📖 En cours', '⏳ Pas commencé'],
            datasets: [{
                data: [finished, inProgress, notStarted],
                backgroundColor: ['#6BCB77','#FDCB6E','#FF6B6B'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 13 }, padding: 15 } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed} élève(s)` } }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                ctx.font = 'bold 28px Arial';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(avg + '%', width / 2, height / 2 - 10);
                ctx.font = '13px Arial';
                ctx.fillStyle = '#888';
                ctx.fillText('moyenne', width / 2, height / 2 + 18);
                ctx.save();
            }
        }]
    });
}

// ====== DIRECTEUR : Barres par classe ======
function drawClassesBarChart(students, school) {
    destroyChart('chart-classes');
    const canvas = document.getElementById('chart-classes');
    if (!canvas || !school?.classes) return;

    const classes = Object.entries(school.classes);
    const labels  = classes.map(([,cl]) => cl.name);
    const data    = classes.map(([cid]) => {
        const cls = students.filter(([,d]) => d.classId === cid);
        return cls.length > 0
            ? Math.round(cls.reduce((a,[,d]) => a + d.learned.length / lettres.length * 100, 0) / cls.length)
            : 0;
    });

    chartInstances['chart-classes'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Progression moyenne (%)',
                data,
                backgroundColor: chartColors.slice(0, classes.length),
                borderRadius: 10,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `Moyenne: ${ctx.parsed.y}%` } }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ====== DIRECTEUR : Barres Coran par classe ======
function drawClassesQuranChart(students, school) {
    destroyChart('chart-classes-quran');
    const canvas = document.getElementById('chart-classes-quran');
    if (!canvas || !school?.classes) return;

    const classes = Object.entries(school.classes);
    const labels  = classes.map(([,cl]) => cl.name);
    const data    = classes.map(([cid]) => {
        const cls = students.filter(([,d]) => d.classId === cid);
        return cls.length > 0
            ? Math.round(cls.reduce((a,[,d]) => a + quranPct(d), 0) / cls.length)
            : 0;
    });

    chartInstances['chart-classes-quran'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Progression Coran (%)',
                data,
                backgroundColor: '#43e97b',
                borderRadius: 10,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `Moyenne: ${ctx.parsed.y}%` } }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ====== DIRECTEUR : Donut école ======
function drawSchoolDonutChart(students, avg, finished) {
    destroyChart('chart-school-donut');
    const canvas = document.getElementById('chart-school-donut');
    if (!canvas) return;

    const inProgress = students.filter(([,d]) => d.learned.length > 0 && d.learned.length < lettres.length).length;
    const notStarted = students.filter(([,d]) => d.learned.length === 0).length;

    chartInstances['chart-school-donut'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['✅ Terminé', '📖 En cours', '⏳ Pas commencé'],
            datasets: [{
                data: [finished, inProgress, notStarted],
                backgroundColor: ['#6BCB77','#4ECDC4','#FF6B6B'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 13 }, padding: 15 } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed} élève(s)` } }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                ctx.font = 'bold 28px Arial';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(avg + '%', width / 2, height / 2 - 10);
                ctx.font = '13px Arial';
                ctx.fillStyle = '#888';
                ctx.fillText('école', width / 2, height / 2 + 18);
                ctx.save();
            }
        }]
    });
}

// ====== LETTRES DIFFICILES (Prof + Directeur) ======
function drawLettersHardChart(students, canvasId) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || students.length === 0) return;

    // Count how many students haven't learned each letter
    const failCount = new Array(lettres.length).fill(0);
    students.forEach(([,d]) => {
        lettres.forEach((_,i) => { if (!d.learned.includes(i)) failCount[i]++; });
    });

    // Sort by difficulty (most difficult first), take top 14
    const indexed = failCount.map((count, i) => ({ letter: lettres[i].l, count }));
    const top = indexed.sort((a,b) => b.count - a.count).slice(0, 14);

    const maxCount = Math.max(...top.map(t => t.count), 1);
    const colors = top.map(t => {
        const heat = t.count / maxCount;
        const r = Math.round(255 * heat);
        const g = Math.round(200 * (1 - heat));
        return `rgba(${r},${g},80,0.8)`;
    });

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top.map(t => t.letter),
            datasets: [{
                label: "Nb d'élèves n'ayant pas appris",
                data: top.map(t => t.count),
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'x',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.y} élève(s) n'ont pas encore appris cette lettre`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f0f0f0' }
                },
                x: {
                    ticks: { font: { size: 18, family: 'Tajawal, Arial', weight: 'bold' } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
//  SUPER ADMIN - RESET & NETTOYAGE
// ============================================

// Supprimer un élève depuis Super Admin
window.supDeleteStudent = async (id) => {
    const snap2 = await getDoc(doc(db,"eleves",id));
    const d2 = snap2.exists() ? snap2.data() : {};
    const name = extractStudentName(id, d2.schoolId, d2.classId);
    if (!confirm(`Supprimer l'élève "${name}" ?`)) return;
    await deleteDoc(doc(db, "eleves", id));
    await supLoadStats();
};

// Réinitialiser TOUTES les données élèves
window.resetAllData = async () => {
    if (!confirm("⚠️ ATTENTION !\n\nCela va supprimer TOUTES les données de TOUS les élèves de TOUTES les écoles.\n\nCette action est IRRÉVERSIBLE !\n\nÊtes-vous absolument sûr ?")) return;
    if (!confirm("Dernière confirmation — supprimer toutes les données ?")) return;

    const all = await getAllStudents();
    let count = 0;
    for (const id of Object.keys(all)) {
        await deleteDoc(doc(db, "eleves", id));
        count++;
    }
    // Also clean absences and submissions
    const absSnap = await getDocs(collection(db, "absences"));
    absSnap.forEach(async d => await deleteDoc(doc(db, "absences", d.id)));
    const subSnap = await getDocs(collection(db, "soumissions"));
    subSnap.forEach(async d => await deleteDoc(doc(db, "soumissions", d.id)));
    const exSnap = await getDocs(collection(db, "exercices"));
    exSnap.forEach(async d => await deleteDoc(doc(db, "exercices", d.id)));

    alert(`✅ Réinitialisation terminée !\n${count} élève(s) supprimé(s).`);
    await supLoadStats();
};

// Nettoyer uniquement les données invalides (sans école ou classe reconnue)
window.resetOrphanStudents = async () => {
    const all = await getAllStudents();
    const schools = await getSchools();

    const orphans = Object.entries(all).filter(([, data]) => {
        const school = schools[data.schoolId];
        const classExists = school?.classes?.[data.classId];
        return !school || !classExists;
    });

    if (orphans.length === 0) {
        alert("✅ Aucune donnée invalide trouvée !");
        return;
    }

    if (!confirm(`🧹 ${orphans.length} élève(s) avec données invalides trouvé(s).\n\nVoulez-vous les supprimer ?`)) return;

    for (const [id] of orphans) {
        await deleteDoc(doc(db, "eleves", id));
    }

    alert(`✅ ${orphans.length} donnée(s) invalide(s) supprimée(s) !`);
    await supLoadStats();
};

// ============================================
//  VOCABULAIRE - 50 MOTS
// ============================================

// Emoji mapping for vocab words without images
function getVocabEmoji(id) {
    const emojiMap = {
        // Family
        v29:"👨", v30:"👩", v31:"👦", v32:"👧", v33:"👴", v34:"👵",
        // Colors - no emoji needed (color circles)
        v35:"🔴", v36:"🔵", v37:"🟢", v38:"🟡", v39:"⚪", v40:"⚫",
        // Body
        v41:"👤", v42:"👁️", v43:"👃", v44:"👄", v45:"🦵",
        // House
        v46:"🚪", v47:"🪑", v48:"🪞", v49:"🪟", v50:"🛏️",
        // Letters - use existing images
    };
    return emojiMap[id] || "📖";
}

const vocabulaire = [
    // ===== LETTRES (28 mots existants) =====
    { id:"v01", cat:"letters", mot:"أَسَد",    trad_fr:"Lion",       trad_nl:"Leeuw",      img:"images/lion.jpg",     son:"sons/alif.mp3",  lettre:"ا" },
    { id:"v02", cat:"letters", mot:"بَطَّة",   trad_fr:"Canard",     trad_nl:"Eend",       img:"images/duck.png",     son:"sons/ba.mp3",    lettre:"ب" },
    { id:"v03", cat:"letters", mot:"تُفَّاحَة", trad_fr:"Pomme",      trad_nl:"Appel",      img:"images/appel.png",    son:"sons/ta.mp3",    lettre:"ت" },
    { id:"v04", cat:"letters", mot:"ثَعْلَب",  trad_fr:"Renard",     trad_nl:"Vos",        img:"images/renard.jpg",   son:"sons/tha.mp3",   lettre:"ث" },
    { id:"v05", cat:"letters", mot:"جَمَل",    trad_fr:"Chameau",    trad_nl:"Kameel",     img:"images/jamal.png",    son:"sons/jim.mp3",   lettre:"ج" },
    { id:"v06", cat:"letters", mot:"حِصَان",   trad_fr:"Cheval",     trad_nl:"Paard",      img:"images/hissan.png",   son:"sons/ha.mp3",    lettre:"ح" },
    { id:"v07", cat:"letters", mot:"خَرُوف",   trad_fr:"Mouton",     trad_nl:"Schaap",     img:"images/kharouf.png",  son:"sons/kha.mp3",   lettre:"خ" },
    { id:"v08", cat:"letters", mot:"دُبّ",     trad_fr:"Ours",       trad_nl:"Beer",       img:"images/Dob.png",      son:"sons/dal.mp3",   lettre:"د" },
    { id:"v09", cat:"letters", mot:"ذِئْب",    trad_fr:"Loup",       trad_nl:"Wolf",       img:"images/dhib.png",     son:"sons/dhal.mp3",  lettre:"ذ" },
    { id:"v10", cat:"letters", mot:"رُمَّان",   trad_fr:"Grenade",    trad_nl:"Granaatappel",img:"images/roman.png",  son:"sons/ra.mp3",    lettre:"ر" },
    { id:"v11", cat:"letters", mot:"زَرَافَة",  trad_fr:"Girafe",     trad_nl:"Giraf",      img:"images/zarafa.png",   son:"sons/za.mp3",    lettre:"ز" },
    { id:"v12", cat:"letters", mot:"سَمَكَة",   trad_fr:"Poisson",    trad_nl:"Vis",        img:"images/samaka.png",   son:"sons/sin.mp3",   lettre:"س" },
    { id:"v13", cat:"letters", mot:"شَمْس",    trad_fr:"Soleil",     trad_nl:"Zon",        img:"images/shams.png",    son:"sons/shin.mp3",  lettre:"ش" },
    { id:"v14", cat:"letters", mot:"صَقْر",    trad_fr:"Faucon",     trad_nl:"Valk",       img:"images/saqr.png",     son:"sons/sad.mp3",   lettre:"ص" },
    { id:"v15", cat:"letters", mot:"ضِفْدَع",  trad_fr:"Grenouille", trad_nl:"Kikker",     img:"images/dofda3.png",   son:"sons/dad.mp3",   lettre:"ض" },
    { id:"v16", cat:"letters", mot:"طَائِرَة",  trad_fr:"Avion",      trad_nl:"Vliegtuig",  img:"images/ta2ira.png",   son:"sons/ta2.mp3",   lettre:"ط" },
    { id:"v17", cat:"letters", mot:"ظَرْف",    trad_fr:"Enveloppe",  trad_nl:"Envelop",    img:"images/zarf.png",     son:"sons/za2.mp3",   lettre:"ظ" },
    { id:"v18", cat:"letters", mot:"عِنَب",    trad_fr:"Raisin",     trad_nl:"Druif",      img:"images/ainab.png",    son:"sons/ain.mp3",   lettre:"ع" },
    { id:"v19", cat:"letters", mot:"غَزَال",   trad_fr:"Gazelle",    trad_nl:"Gazelle",    img:"images/ghazal.png",   son:"sons/ghain.mp3", lettre:"غ" },
    { id:"v20", cat:"letters", mot:"فِيل",     trad_fr:"Éléphant",   trad_nl:"Olifant",    img:"images/feel.png",     son:"sons/fa.mp3",    lettre:"ف" },
    { id:"v21", cat:"letters", mot:"قَلَم",    trad_fr:"Stylo",      trad_nl:"Pen",        img:"images/qalam.png",    son:"sons/qaf.mp3",   lettre:"ق" },
    { id:"v22", cat:"letters", mot:"كِتَاب",   trad_fr:"Livre",      trad_nl:"Boek",       img:"images/kitab.png",    son:"sons/kaf.mp3",   lettre:"ك" },
    { id:"v23", cat:"letters", mot:"لَيْمُون",  trad_fr:"Citron",     trad_nl:"Citroen",    img:"images/laymoun.png",  son:"sons/lam.mp3",   lettre:"ل" },
    { id:"v24", cat:"letters", mot:"مَوْز",    trad_fr:"Banane",     trad_nl:"Banaan",     img:"images/mouz.png",     son:"sons/mim.mp3",   lettre:"م" },
    { id:"v25", cat:"letters", mot:"نَمِر",    trad_fr:"Tigre",      trad_nl:"Tijger",     img:"images/namir.png",    son:"sons/noun.mp3",  lettre:"ن" },
    { id:"v26", cat:"letters", mot:"هُدْهُد",   trad_fr:"Huppe",      trad_nl:"Hop",        img:"images/hodhod.png",   son:"sons/ha2.mp3",   lettre:"هـ" },
    { id:"v27", cat:"letters", mot:"وَرْدَة",   trad_fr:"Rose",       trad_nl:"Roos",       img:"images/warda.png",    son:"sons/waw.mp3",   lettre:"و" },
    { id:"v28", cat:"letters", mot:"يَد",      trad_fr:"Main",       trad_nl:"Hand",       img:"images/yad.png",      son:"sons/ya.mp3",    lettre:"ي" },

    // ===== FAMILLE (6 mots) =====
    { id:"v29", cat:"family", mot:"أَب",      trad_fr:"Père",       trad_nl:"Vader",      img:"images/vocab/ab.png",     son:"sons/vocab/ab.mp3",     lettre:"" },
    { id:"v30", cat:"family", mot:"أُمّ",     trad_fr:"Mère",       trad_nl:"Moeder",     img:"images/vocab/omm.png",    son:"sons/vocab/omm.mp3",    lettre:"" },
    { id:"v31", cat:"family", mot:"أَخ",      trad_fr:"Frère",      trad_nl:"Broer",      img:"images/vocab/akh.png",    son:"sons/vocab/akh.mp3",    lettre:"" },
    { id:"v32", cat:"family", mot:"أُخْت",    trad_fr:"Sœur",       trad_nl:"Zus",        img:"images/vocab/okht.png",   son:"sons/vocab/okht.mp3",   lettre:"" },
    { id:"v33", cat:"family", mot:"جَدّ",     trad_fr:"Grand-père", trad_nl:"Grootvader", img:"images/vocab/jadd.png",   son:"sons/vocab/jadd.mp3",   lettre:"" },
    { id:"v34", cat:"family", mot:"جَدَّة",   trad_fr:"Grand-mère", trad_nl:"Grootmoeder",img:"images/vocab/jadda.png",  son:"sons/vocab/jadda.mp3",  lettre:"" },

    // ===== COULEURS (6 mots) =====
    { id:"v35", cat:"colors", mot:"أَحْمَر",   trad_fr:"Rouge",      trad_nl:"Rood",       img:"images/vocab/rouge.png",  son:"sons/vocab/ahmar.mp3",  color:"#FF0000", lettre:"" },
    { id:"v36", cat:"colors", mot:"أَزْرَق",   trad_fr:"Bleu",       trad_nl:"Blauw",      img:"images/vocab/bleu.png",   son:"sons/vocab/azraq.mp3",  color:"#0000FF", lettre:"" },
    { id:"v37", cat:"colors", mot:"أَخْضَر",   trad_fr:"Vert",       trad_nl:"Groen",      img:"images/vocab/vert.png",   son:"sons/vocab/akhdar.mp3", color:"#00AA00", lettre:"" },
    { id:"v38", cat:"colors", mot:"أَصْفَر",   trad_fr:"Jaune",      trad_nl:"Geel",       img:"images/vocab/jaune.png",  son:"sons/vocab/asfar.mp3",  color:"#FFD700", lettre:"" },
    { id:"v39", cat:"colors", mot:"أَبْيَض",   trad_fr:"Blanc",      trad_nl:"Wit",        img:"images/vocab/blanc.png",  son:"sons/vocab/abyad.mp3",  color:"#FFFFFF", lettre:"" },
    { id:"v40", cat:"colors", mot:"أَسْوَد",   trad_fr:"Noir",       trad_nl:"Zwart",      img:"images/vocab/noir.png",   son:"sons/vocab/aswad.mp3",  color:"#000000", lettre:"" },

    // ===== CORPS HUMAIN (5 mots) =====
    { id:"v41", cat:"body", mot:"رَأْس",     trad_fr:"Tête",       trad_nl:"Hoofd",      img:"images/vocab/ras.png",    son:"sons/vocab/ras.mp3",    lettre:"" },
    { id:"v42", cat:"body", mot:"عَيْن",     trad_fr:"Œil",        trad_nl:"Oog",        img:"images/vocab/ain.png",    son:"sons/vocab/ain2.mp3",   lettre:"" },
    { id:"v43", cat:"body", mot:"أَنْف",     trad_fr:"Nez",        trad_nl:"Neus",       img:"images/vocab/anf.png",    son:"sons/vocab/anf.mp3",    lettre:"" },
    { id:"v44", cat:"body", mot:"فَم",       trad_fr:"Bouche",     trad_nl:"Mond",       img:"images/vocab/fam.png",    son:"sons/vocab/fam.mp3",    lettre:"" },
    { id:"v45", cat:"body", mot:"رِجْل",     trad_fr:"Jambe",      trad_nl:"Been",       img:"images/vocab/rijl.png",   son:"sons/vocab/rijl.mp3",   lettre:"" },

    // ===== MAISON & OBJETS (5 mots) =====
    { id:"v46", cat:"house", mot:"بَاب",     trad_fr:"Porte",      trad_nl:"Deur",       img:"images/vocab/bab.png",    son:"sons/vocab/bab.mp3",    lettre:"" },
    { id:"v47", cat:"house", mot:"كُرْسِي",  trad_fr:"Chaise",     trad_nl:"Stoel",      img:"images/vocab/kursi.png",  son:"sons/vocab/kursi.mp3",  lettre:"" },
    { id:"v48", cat:"house", mot:"طَاوِلَة",  trad_fr:"Table",      trad_nl:"Tafel",      img:"images/vocab/tawila.png", son:"sons/vocab/tawila.mp3", lettre:"" },
    { id:"v49", cat:"house", mot:"نَافِذَة",  trad_fr:"Fenêtre",    trad_nl:"Raam",       img:"images/vocab/nafida.png", son:"sons/vocab/nafida.mp3", lettre:"" },
    { id:"v50", cat:"house", mot:"سَرِير",   trad_fr:"Lit",        trad_nl:"Bed",        img:"images/vocab/sarir.png",  son:"sons/vocab/sarir.mp3",  lettre:"" },
];

const catLabels = {
    all: "🌟 الكل", letters: "🔤 الحروف",
    family: "👨‍👩‍👧 العائلة", colors: "🎨 الألوان",
    body: "🧍 الجسم", house: "🏠 المنزل"
};

let currentVocabFilter = "all";

// ====== LOAD VOCAB ======
async function loadVocab() {
    if(!currentUser) return;
    const data = await getStudentData(currentUser);
    const learnedVocab = data.learnedVocab || [];
    renderVocab(currentVocabFilter, learnedVocab);
    updateVocabProgress(learnedVocab);
}

function renderVocab(filter, learnedVocab) {
    const list = filter === "all" ? vocabulaire : vocabulaire.filter(v => v.cat === filter);
    const grid = document.getElementById("vocab-grid");
    if (!grid) return;

    grid.innerHTML = list.map(word => {
        const learned = learnedVocab.includes(word.id);
        const colorStyle = word.color ? `background:${word.color};border:3px solid rgba(0,0,0,0.1)` : "";
        const emoji = getVocabEmoji(word.id);
        return `
        <div class="vocab-card ${learned ? "vocab-learned" : ""}" onclick="openVocabCard('${word.id}')">
            ${learned ? '<div class="vocab-learned-badge">✓</div>' : ""}
            <div class="vocab-img-wrap">
                ${word.color
                    ? `<div style="width:80px;height:80px;border-radius:50%;${colorStyle};margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>`
                    : `<img src="${word.img}" class="vocab-img" alt="${word.mot}"
                        onerror="this.style.display='none';this.parentElement.querySelector('.vocab-emoji-fb') && (this.parentElement.querySelector('.vocab-emoji-fb').style.display='block')"
                      ><div class="vocab-emoji-fb" style="display:none;font-size:50px;line-height:1">${emoji}</div>`
                }
            </div>
            <div class="vocab-word">${word.mot}</div>
            <div class="vocab-trad">${word.trad_fr} / ${word.trad_nl}</div>
            ${word.lettre ? `<div class="vocab-lettre-badge">${word.lettre}</div>` : ""}
        </div>`;
    }).join("");
}

function updateVocabProgress(learnedVocab) {
    const pct = Math.round(learnedVocab.length / vocabulaire.length * 100);
    const fill = document.getElementById("vocab-progress-fill");
    const text = document.getElementById("vocab-progress-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = learnedVocab.length + " / " + vocabulaire.length + " كلمة تعلّمتها";
}

window.filterVocab = async (filter, btn) => {
    currentVocabFilter = filter;
    document.querySelectorAll(".vocab-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const data = await getStudentData(currentUser);
    renderVocab(filter, data.learnedVocab || []);
};

// ====== OPEN VOCAB CARD ======
window.openVocabCard = async (id) => {
    const word = vocabulaire.find(v => v.id === id);
    if (!word) return;
    const data = await getStudentData(currentUser);
    const learnedVocab = data.learnedVocab || [];
    const learned = learnedVocab.includes(id);

    const existing = document.getElementById("vocab-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "vocab-modal";
    modal.className = "exercise-modal";
    modal.innerHTML = `
        <div class="exercise-modal-content" style="max-width:360px;text-align:center">
            <div class="exercise-modal-header">
                <h3 style="color:var(--primary);font-size:22px">${catLabels[word.cat]}</h3>
                <button onclick="closeVocabModal()" class="btn-close-modal">✕</button>
            </div>
            <div class="vocab-card-big">
                ${word.color
                    ? `<div style="width:130px;height:130px;border-radius:50%;background:${word.color};border:4px solid rgba(0,0,0,0.1);margin:0 auto 15px;box-shadow:0 8px 24px rgba(0,0,0,0.15)"></div>`
                    : word.cat === "letters"
                        ? `<img src="${word.img}" style="width:150px;height:150px;object-fit:contain;border-radius:20px;margin-bottom:15px" onerror="this.outerHTML='<div style=font-size:80px;margin-bottom:15px>'+getVocabEmoji('${word.id}')+'</div>'">`
                        : `<div style="font-size:90px;margin-bottom:15px">${getVocabEmoji(word.id)}</div>`
                }
                <div style="font-size:52px;font-weight:900;color:var(--primary);font-family:Tajawal,Arial;margin-bottom:8px">${word.mot}</div>
                <div style="font-size:18px;color:var(--text-light);margin-bottom:5px">🇫🇷 ${word.trad_fr}</div>
                <div style="font-size:18px;color:var(--text-light);margin-bottom:20px">🇳🇱 ${word.trad_nl}</div>
                ${word.lettre ? `<div style="background:#f0eeff;color:var(--purple);padding:6px 16px;border-radius:20px;font-size:16px;display:inline-block;margin-bottom:15px">الحرف : ${word.lettre}</div>` : ""}
            </div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                <button onclick="playVocabSound('${word.son}')" class="btn-audio">🔊 استمع</button>
                ${!learned
                    ? `<button onclick="markVocabLearned('${id}')" class="btn-done">✅ تعلّمت هذه الكلمة</button>`
                    : `<div style="color:var(--green);font-weight:700;padding:12px 20px;background:#e8f8ec;border-radius:25px">✅ تعلّمتها!</div>`
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // Auto play sound
    setTimeout(() => playVocabSound(word.son), 300);
};

window.playVocabSound = async (src) => {
    const word = vocabulaire.find(v => v.son === src);
    const ok = await window.playNormalizedAudio(src);
    if (!ok && word) window.speakArabic(word.mot); // Fichier non trouvé → synthèse vocale en repli
};

window.markVocabLearned = async (id) => {
    const data = await getStudentData(currentUser);
    data.learnedVocab = data.learnedVocab || [];
    if (!data.learnedVocab.includes(id)) {
        data.learnedVocab.push(id);
        data.lastActivity = new Date().toISOString();
        await saveStudentData(currentUser, data);
    }
    closeVocabModal();
    await loadVocab();
};

window.closeVocabModal = () => {
    const m = document.getElementById("vocab-modal");
    if (m) m.remove();
};

// ============================================================
// ===== MODULE CORAN — حروفي =====
// ============================================================

const SURAHS = [
  { id: "fatiha",  name_ar: "الفاتحة",  name_fr: "L'Ouverture",      name_nl: "De Opening",       ayahs: 7,  color: "#667eea" },
  { id: "nas",     name_ar: "الناس",    name_fr: "Les Hommes",       name_nl: "De Mensen",        ayahs: 6,  color: "#43e97b" },
  { id: "falaq",   name_ar: "الفلق",    name_fr: "L'Aube Naissante", name_nl: "De Dageraad",      ayahs: 5,  color: "#4facfe" },
  { id: "ikhlas",  name_ar: "الإخلاص",  name_fr: "La Pureté",        name_nl: "De Oprechtheid",   ayahs: 4,  color: "#f093fb" },
  { id: "masad",   name_ar: "المسد",    name_fr: "Les Fibres",       name_nl: "De Palmvezel",     ayahs: 5,  color: "#ff6b6b" },
  { id: "nasr",    name_ar: "النصر",    name_fr: "Le Secours",       name_nl: "De Overwinning",   ayahs: 3,  color: "#a8edea" },
  { id: "kafirun", name_ar: "الكافرون", name_fr: "Les Infidèles",    name_nl: "De Ongelovigen",   ayahs: 6,  color: "#ffecd2" },
  { id: "kawthar", name_ar: "الكوثر",   name_fr: "L'Abondance",      name_nl: "De Overvloed",     ayahs: 3,  color: "#fa709a" },
  { id: "fil",      name_ar: "الفيل",      name_fr: "L'Éléphant",           name_nl: "De Olifant",         ayahs: 5,  color: "#30cfd0" },
  { id: "humaza",   name_ar: "الهمزة",     name_fr: "Le Calomniateur",      name_nl: "De Lasteraar",       ayahs: 9,  color: "#f6d365" },
  { id: "asr",      name_ar: "العصر",      name_fr: "Le Temps",             name_nl: "De Tijd",            ayahs: 3,  color: "#84fab0" },
  { id: "takathur", name_ar: "التكاثر",    name_fr: "La Course aux richesses", name_nl: "De Wedloop om meer", ayahs: 8,  color: "#ff9a9e" },
  { id: "adiyat",   name_ar: "العاديات",   name_fr: "Les Coursiers",        name_nl: "De Renners",         ayahs: 11, color: "#a1c4fd" },
  { id: "maoun",    name_ar: "الماعون",    name_fr: "L'Ustensile",          name_nl: "Het Gebruiksvoorwerp", ayahs: 6,  color: "#d4a5f9" },
  { id: "quraych",  name_ar: "قريش",       name_fr: "Les Quraychites",      name_nl: "De Qoeraisj",        ayahs: 5,  color: "#ffc3a0" },
  { id: "qari3a",   name_ar: "القارعة",    name_fr: "Le Fracas",            name_nl: "De Verpletterende Slag", ayahs: 10, color: "#c471ed" },
  { id: "zalzala",  name_ar: "الزلزلة",    name_fr: "Le Séisme",            name_nl: "De Aardbeving",      ayahs: 9,  color: "#f77062" },
  { id: "bayina",   name_ar: "البينة",     name_fr: "La Preuve",            name_nl: "Het Duidelijke Bewijs", ayahs: 8,  color: "#43e97b" },
  { id: "qadr",    name_ar: "القدر",    name_fr: "La Destinée",     name_nl: "De Macht",          ayahs: 5,  color: "#6a82fb" },
  { id: "alaq",    name_ar: "العلق",    name_fr: "L'Adhérence",     name_nl: "De Bloedklonter",   ayahs: 20, color: "#fc5c7d" },
  { id: "tine",    name_ar: "التين",    name_fr: "Le Figuier",      name_nl: "De Vijg",           ayahs: 8,  color: "#f7971e" },
  { id: "charh",   name_ar: "الشرح",    name_fr: "L'Ouverture",     name_nl: "De Verruiming",     ayahs: 8,  color: "#38ef7d" },
  { id: "doha",    name_ar: "الضحى",    name_fr: "Le Jour montant", name_nl: "De Ochtendglans",   ayahs: 11, color: "#f6d365" },
  { id: "layl",    name_ar: "الليل",    name_fr: "La Nuit",         name_nl: "De Nacht",          ayahs: 21, color: "#30336b" },
  { id: "chams",   name_ar: "الشمس",    name_fr: "Le Soleil",       name_nl: "De Zon",            ayahs: 15, color: "#ff9a44" },
  { id: "balad",   name_ar: "البلد",    name_fr: "La Cité",         name_nl: "De Stad",           ayahs: 20, color: "#8e54e9" },
  { id: "fajr",    name_ar: "الفجر",    name_fr: "L'Aube",          name_nl: "De Dageraad",       ayahs: 32, color: "#eb3349" },
  { id: "ghachiya",    name_ar: "الغاشية",    name_fr: "L'Enveloppante",         name_nl: "De Overweldigende Gebeurtenis", ayahs: 26, color: "#a18cd1" },
  { id: "a3la",        name_ar: "الأعلى",     name_fr: "Le Très-Haut",           name_nl: "De Allerhoogste",               ayahs: 19, color: "#43cea2" },
  { id: "tariq",       name_ar: "الطارق",     name_fr: "L'Astre Nocturne",       name_nl: "De Nachtelijke Ster",           ayahs: 17, color: "#232526" },
  { id: "bourouj",     name_ar: "البروج",     name_fr: "Les Constellations",     name_nl: "De Sterrenbeelden",             ayahs: 22, color: "#396afc" },
  { id: "inchiqaq",    name_ar: "الانشقاق",   name_fr: "La Déchirure",           name_nl: "De Splijting",                  ayahs: 25, color: "#f7797d" },
  { id: "moutaffifin", name_ar: "المطففين",   name_fr: "Les Fraudeurs",          name_nl: "De Bedriegers",                 ayahs: 36, color: "#7f7fd5" },
  { id: "infitar",     name_ar: "الانفطار",   name_fr: "La Rupture",             name_nl: "Het Openbarsten",               ayahs: 19, color: "#fc4a1a" },
  { id: "takwir",      name_ar: "التكوير",    name_fr: "L'Obscurcissement",      name_nl: "Het Opgerold Worden",           ayahs: 29, color: "#0f2027" },
  { id: "abasa",       name_ar: "عبس",        name_fr: "Il s'est renfrogné",     name_nl: "Hij Fronste",                   ayahs: 42, color: "#f857a6" },
  { id: "naziat",      name_ar: "النازعات",   name_fr: "Les Anges Arracheurs",   name_nl: "De Ontrukkenden",               ayahs: 45, color: "#4568dc" },
  { id: "naba",        name_ar: "النبأ",      name_fr: "La Nouvelle",            name_nl: "De Tijding",                    ayahs: 40, color: "#b06ab3" },
];

let currentSurah = null;
let currentSurahData = null;
let currentQuranMode = "listen";
let currentAyahIndex = 0;
let quranMemorized = {}; // { surahId: [ayahNumbers mémorisés] }

// Charger les données mémorisées depuis Firebase
async function loadQuranProgress() {
  try {
    const data = await getStudentData(currentUser);
    quranMemorized = data.quranMemorized || {};
  } catch(e) {
    quranMemorized = {};
  }
}

async function saveQuranProgress() {
  try {
    const data = await getStudentData(currentUser);
    data.quranMemorized = quranMemorized;
    await saveStudentData(currentUser, data);
  } catch(e) {}
}

// Afficher la liste des sourates
window.showQuranHome = () => {
  document.getElementById("quran-home").classList.remove("hidden");
  document.getElementById("quran-surah-view").classList.add("hidden");
  renderSurahList();
};

function renderSurahList() {
  const el = document.getElementById("quran-surah-list");
  if (!el) return;
  el.innerHTML = SURAHS.map(s => {
    const memorized = (quranMemorized[s.id] || []).length;
    const pct = Math.round((memorized / s.ayahs) * 100);
    return `
      <div class="surah-card" onclick="openSurah('${s.id}')" style="border-left: 4px solid ${s.color}">
        <div class="surah-card-info">
          <div class="surah-name-ar" style="color:${s.color}">${s.name_ar}</div>
          <div class="surah-name-fr">${s.name_fr} — ${s.name_nl}</div>
          <div class="surah-ayahs">${s.ayahs} آيات</div>
        </div>
        <div class="surah-card-progress">
          <div class="surah-progress-bar">
            <div class="surah-progress-fill" style="width:${pct}%;background:${s.color}"></div>
          </div>
          <div class="surah-progress-text">${memorized}/${s.ayahs}</div>
        </div>
      </div>`;
  }).join("");
}

// Ouvrir une sourate
window.openSurah = async (surahId) => {
  currentSurah = SURAHS.find(s => s.id === surahId);
  if (!currentSurah) return;
  try {
    const res = await fetch(`quran/${surahId}.json`);
    currentSurahData = await res.json();
  } catch(e) {
    alert("Erreur chargement sourate");
    return;
  }
  currentAyahIndex = 0;
  currentQuranMode = "listen";
  document.getElementById("quran-home").classList.add("hidden");
  document.getElementById("quran-surah-view").classList.remove("hidden");
  document.getElementById("qsv-name-ar").textContent = currentSurah.name_ar;
  document.getElementById("qsv-name-fr").textContent = currentSurah.name_fr + " — " + currentSurah.name_nl;
  updateQuranProgress();
  document.querySelectorAll(".quran-mode-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("qmode-listen").classList.add("active");
  renderListenMode();
};

function updateQuranProgress() {
  const memorized = (quranMemorized[currentSurah.id] || []).length;
  const el = document.getElementById("qsv-progress");
  if (el) el.textContent = memorized + " / " + currentSurah.ayahs;
}

// Retourne la traduction correspondant à la langue de l'école (une seule, pas les deux),
// avec repli sur le français si la langue choisie n'a pas encore de traduction disponible (anglais/espagnol).
function getAyahTranslation(ayah) {
  if (currentUILang === "nl") return { flag: "🇧🇪", text: ayah.dutch };
  if (currentUILang === "fr") return { flag: "🇫🇷", text: ayah.french };
  if (currentUILang === "en" || currentUILang === "es") {
    // Pas encore de traduction anglaise/espagnole du Coran : on utilise le français en repli,
    // en le signalant, plutôt que d'afficher une langue non choisie sans explication.
    return { flag: "🇫🇷", text: ayah.french, fallbackNote: true };
  }
  return { flag: "🇫🇷", text: ayah.french }; // par défaut si aucune langue d'école choisie
}

// ===== MODE ÉCOUTE =====
function renderListenMode() {
  const ayah = currentSurahData.ayahs[currentAyahIndex];
  const total = currentSurahData.ayahs.length;
  const isFirst = currentAyahIndex === 0;
  const isLast = currentAyahIndex === total - 1;
  const trans = getAyahTranslation(ayah);

  document.getElementById("quran-mode-content").innerHTML = `
    <div class="quran-ayah-card">
      <div class="quran-ayah-number">الآية ${ayah.number}</div>
      <div class="quran-ayah-arabic" style="font-size:1.6em;line-height:2.1">${ayah.arabic}</div>
      <div class="quran-ayah-translation hidden" id="q-translation">
        <div class="q-trans-single" style="font-size:1.4em;line-height:1.7">${trans.flag} ${trans.text}</div>
        ${trans.fallbackNote ? `<div style="font-size:12px;color:#999;margin-top:6px">(Traduction en ${currentUILang==="en"?"anglais":"espagnol"} pas encore disponible — français affiché)</div>` : ""}
      </div>
      <button onclick="toggleQTranslation()" class="q-trans-btn">💡 ماذا تعني؟</button>
    </div>
    <div class="quran-listen-controls">
      <button onclick="repeatAyah()" class="q-btn-repeat">🔁 كرر</button>
      <button onclick="speakAyah()" class="q-btn-listen">🔊 استمع</button>
    </div>
    <div class="quran-nav">
      <button onclick="prevAyah()" class="q-nav-btn" ${isFirst ? "disabled" : ""}>→ ${bi("السابقة","prevAyah")}</button>
      <span class="q-nav-counter">${currentAyahIndex + 1} / ${total}</span>
      <button onclick="nextAyah()" class="q-nav-btn" ${isLast ? "disabled" : ""}>← ${bi("التالية","nextAyah")}</button>
    </div>
    ${isLast ? `<button onclick="setQuranMode('memorize', document.getElementById('qmode-memorize'))" class="q-btn-memorize">🧠 انتقل للحفظ</button>` : ""}
  `;
  speakAyah();
}

window.toggleQTranslation = () => {
  const el = document.getElementById("q-translation");
  if (el) el.classList.toggle("hidden");
};

// ===== LECTURE AUDIO AVEC VOLUME NORMALISÉ =====
// Analyse le pic sonore de chaque MP3 et ajuste le gain pour que toutes
// les récitations sonnent avec une intensité similaire à la lecture.
const TARGET_PEAK = 0.9; // niveau sonore cible (0 à 1)
const MAX_GAIN = 4;      // ne pas trop amplifier un enregistrement très faible (bruit)

function getAudioCtx() {
  if (!window._houroufAudioCtx) {
    window._houroufAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window._houroufAudioCtx.state === "suspended") {
    window._houroufAudioCtx.resume();
  }
  return window._houroufAudioCtx;
}

// Retourne true si la lecture a réussi, false si le fichier est introuvable/invalide
window.playNormalizedAudio = function (path) {
  return new Promise(async (resolve) => {
    try {
      const ctx = getAudioCtx();
      const response = await fetch(path);
      if (!response.ok) throw new Error("fichier introuvable");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Mesurer le pic sonore (échantillonnage léger pour rester rapide)
      let peak = 0;
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        const data = audioBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i += 25) {
          const abs = Math.abs(data[i]);
          if (abs > peak) peak = abs;
        }
      }
      const gainValue = peak > 0.01 ? Math.min(TARGET_PEAK / peak, MAX_GAIN) : 1;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = gainValue;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.onended = () => resolve(true);
      source.start(0);
    } catch (err) {
      resolve(false);
    }
  });
};

window.speakAyah = async () => {
  if (!currentSurahData) return;
  const ayah = currentSurahData.ayahs[currentAyahIndex];
  const mp3Path = `quran/audio/${currentSurah.id}_${ayah.number}.mp3`;
  const ok = await window.playNormalizedAudio(mp3Path);
  if (!ok) window.speakArabic(ayah.arabic); // Fichier MP3 non trouvé → synthèse vocale
};

let isRepeatingAyah = false;
window.repeatAyah = async () => {
  if (!currentSurahData || isRepeatingAyah) return;
  isRepeatingAyah = true;
  window.speechSynthesis && window.speechSynthesis.cancel();

  const REPEAT_COUNT = 3;
  const PAUSE_MS = 500;
  const ayah = currentSurahData.ayahs[currentAyahIndex];
  const mp3Path = `quran/audio/${currentSurah.id}_${ayah.number}.mp3`;

  const repeatBtn = document.querySelector(".q-btn-repeat");
  if (repeatBtn) { repeatBtn.disabled = true; repeatBtn.textContent = "🔁 ..."; }

  for (let i = 0; i < REPEAT_COUNT; i++) {
    const ok = await window.playNormalizedAudio(mp3Path);
    if (!ok) {
      window.speakArabic(ayah.arabic);
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }
    if (i < REPEAT_COUNT - 1) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    }
  }

  if (repeatBtn) { repeatBtn.disabled = false; repeatBtn.textContent = "🔁 كرر"; }
  isRepeatingAyah = false;
};



window.nextAyah = () => {
  if (currentAyahIndex < currentSurahData.ayahs.length - 1) {
    currentAyahIndex++;
    renderCurrentMode();
  }
};

window.prevAyah = () => {
  if (currentAyahIndex > 0) {
    currentAyahIndex--;
    renderCurrentMode();
  }
};

// ===== MODE LECTURE =====
function renderReadMode() {
  const content = document.getElementById("quran-mode-content");
  content.innerHTML = `
    <div class="quran-full-surah" dir="rtl">
      <div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      ${currentSurahData.ayahs.map((ayah, i) => {
        const memorized = (quranMemorized[currentSurah.id] || []).includes(ayah.number);
        return `
          <div class="quran-full-ayah ${memorized ? 'memorized' : ''}" id="read-ayah-${i}" onclick="selectAyahFromRead(${i})">
            <span class="quran-full-text" style="font-size:1.5em;line-height:2.2">${ayah.arabic}</span>
            <span class="ayah-marker">﴿${ayah.number}﴾</span>
          </div>`;
      }).join("")}
    </div>
    <button onclick="speakFullSurah()" class="q-btn-listen" id="btn-speak-full-surah" style="margin-top:16px">🔊 <span id="btn-speak-full-surah-label">${bi("استمع للسورة كاملة","listenFullSurah")}</span></button>
  `;
}

window.selectAyahFromRead = (i) => {
  currentAyahIndex = i;
  setQuranMode("listen", document.getElementById("qmode-listen"));
};

window.speakFullSurah = async () => {
  const btn = document.getElementById("btn-speak-full-surah");
  if (btn) { btn.disabled = true; btn.innerHTML = `⏸️ <span id="btn-speak-full-surah-label">${bi("جاري القراءة...","readingInProgress")}</span>`; }

  // Lire la Bassmala en premier (MP3 dédié si présent, sinon synthèse vocale)
  const basmalaOk = await window.playNormalizedAudio(`quran/audio/basmala.mp3`);
  if (!basmalaOk) {
    window.speakArabic("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
    await new Promise(r => setTimeout(r, 2000));
  }
  await new Promise(r => setTimeout(r, 500)); // pause après la Bassmala

  // Jouer les MP3 en séquence, un par un, avec volume normalisé et surlignage synchronisé
  for (let i = 0; i < currentSurahData.ayahs.length; i++) {
    // ✨ Surligner le verset en cours et faire défiler la page vers lui
    document.querySelectorAll(".quran-full-ayah.now-playing").forEach(el => el.classList.remove("now-playing"));
    const ayahEl = document.getElementById(`read-ayah-${i}`);
    if (ayahEl) {
      ayahEl.classList.add("now-playing");
      ayahEl.style.background = "#fff3cd";
      ayahEl.style.borderRadius = "10px";
      ayahEl.style.transition = "background 0.3s";
      ayahEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const ayah = currentSurahData.ayahs[i];
    const mp3Path = `quran/audio/${currentSurah.id}_${ayah.number}.mp3`;
    const ok = await window.playNormalizedAudio(mp3Path);
    if (!ok) {
      // Fallback synthèse vocale pour cet ayah
      window.speakArabic(ayah.arabic);
      await new Promise(r => setTimeout(r, 2000));
    }

    // Retirer le surlignage juste avant la pause, pour bien marquer la transition
    if (ayahEl) { ayahEl.classList.remove("now-playing"); ayahEl.style.background = ""; }
    await new Promise(r => setTimeout(r, 500)); // pause entre les ayahs
  }

  if (btn) { btn.disabled = false; btn.innerHTML = `🔊 <span id="btn-speak-full-surah-label">${bi("استمع للسورة كاملة","listenFullSurah")}</span>`; }
};

// ===== MODE MÉMORISATION =====
function renderMemorizeMode() {
  const ayah = currentSurahData.ayahs[currentAyahIndex];
  const total = currentSurahData.ayahs.length;
  const memorized = (quranMemorized[currentSurah.id] || []).includes(ayah.number);

  document.getElementById("quran-mode-content").innerHTML = `
    <div class="quran-ayah-card memorize-card">
      <div class="quran-ayah-number">الآية ${ayah.number} — حفظ</div>
      <div class="quran-ayah-arabic" style="font-size:1.6em;line-height:2.1">${ayah.arabic}</div>
    </div>
    <div class="quran-listen-controls">
      <button onclick="speakAyah()" class="q-btn-listen">🔊 استمع</button>
      <button onclick="repeatAyah()" class="q-btn-repeat">🔁 كرر</button>
    </div>
    <div class="memorize-action">
      ${memorized
        ? `<div class="memorized-badge">✅ حفظتها!</div>`
        : `<button onclick="markAyahMemorized(${ayah.number})" class="q-btn-memorize">✅ تم الحفظ</button>`
      }
    </div>
    <div class="quran-nav">
      <button onclick="prevAyah()" class="q-nav-btn" ${currentAyahIndex===0?"disabled":""}>→ ${bi("السابقة","prevAyah")}</button>
      <span class="q-nav-counter">${currentAyahIndex+1} / ${total}</span>
      <button onclick="nextAyah()" class="q-nav-btn" ${currentAyahIndex===total-1?"disabled":""}>← ${bi("التالية","nextAyah")}</button>
    </div>
  `;
  speakAyah();
}

window.markAyahMemorized = async (ayahNum) => {
  if (!quranMemorized[currentSurah.id]) quranMemorized[currentSurah.id] = [];
  if (!quranMemorized[currentSurah.id].includes(ayahNum)) {
    quranMemorized[currentSurah.id].push(ayahNum);
    await saveQuranProgress();
    updateQuranProgress();
    renderMemorizeMode();
    if (currentAyahIndex < currentSurahData.ayahs.length - 1) {
      setTimeout(() => { currentAyahIndex++; renderMemorizeMode(); }, 800);
    }
  }
};

// ===== MODE QUIZ =====
function renderQuizMode() {
  const ayah = currentSurahData.ayahs[currentAyahIndex];
  const total = currentSurahData.ayahs.length;
  const words = ayah.arabic.split(" ");
  const blankIdx = Math.floor(Math.random() * words.length);
  const correctWord = words[blankIdx];
  const displayed = words.map((w, i) => i === blankIdx ? "______" : w).join(" ");

  // Générer des distracteurs depuis les autres ayahs
  const allWords = currentSurahData.ayahs
    .filter((_, i) => i !== currentAyahIndex)
    .flatMap(a => a.arabic.split(" "))
    .filter(w => w !== correctWord);
  const shuffled = allWords.sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = [correctWord, ...shuffled].sort(() => Math.random() - 0.5);

  document.getElementById("quran-mode-content").innerHTML = `
    <div class="quran-ayah-card quiz-card">
      <div class="quran-ayah-number">الآية ${ayah.number} — اختبر حفظك</div>
      <div class="quran-ayah-arabic quiz-text" dir="rtl">${displayed}</div>
    </div>
    <div class="quiz-choices" dir="rtl">
      ${choices.map(c => `
        <button class="quiz-choice-btn" onclick="checkQuranAnswer(this,'${c}','${correctWord}')">
          ${c}
        </button>`).join("")}
    </div>
    <div id="quiz-result" class="quiz-result hidden"></div>
    <div class="quran-nav" style="margin-top:16px">
      <button onclick="prevAyah()" class="q-nav-btn" ${currentAyahIndex===0?"disabled":""}>→ ${bi("السابقة","prevAyah")}</button>
      <span class="q-nav-counter">${currentAyahIndex+1} / ${total}</span>
      <button onclick="nextAyah()" class="q-nav-btn" ${currentAyahIndex===total-1?"disabled":""}>← ${bi("التالية","nextAyah")}</button>
    </div>
  `;
}

window.checkQuranAnswer = (btn, chosen, correct) => {
  document.querySelectorAll(".quiz-choice-btn").forEach(b => b.disabled = true);
  const result = document.getElementById("quiz-result");
  result.classList.remove("hidden");
  if (chosen === correct) {
    btn.style.background = "#27ae60";
    btn.style.color = "white";
    result.innerHTML = "✅ صحيح!";
    result.style.color = "#27ae60";
    speakAyah();
  } else {
    btn.style.background = "#e74c3c";
    btn.style.color = "white";
    document.querySelectorAll(".quiz-choice-btn").forEach(b => {
      if (b.textContent.trim() === correct) { b.style.background="#27ae60"; b.style.color="white"; }
    });
    result.innerHTML = "❌ الجواب الصحيح: " + correct;
    result.style.color = "#e74c3c";
  }
};

// ===== NAVIGATION MODES =====
window.setQuranMode = (mode, btn) => {
  currentQuranMode = mode;
  document.querySelectorAll(".quran-mode-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderCurrentMode();
};

function renderCurrentMode() {
  switch(currentQuranMode) {
    case "listen":   renderListenMode();   break;
    case "read":     renderReadMode();     break;
    case "memorize": renderMemorizeMode(); break;
    case "quiz":     renderQuizMode();     break;
  }
}

// Initialiser le module Coran quand l'onglet est ouvert
// switchTab Coran géré dans le patch unifié ci-dessus

// ============================================================
// ===== FIN MODULE CORAN =====
// ============================================================
