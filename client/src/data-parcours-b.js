// Contenu pédagogique du Parcours arabe — Mondes 4 à 7.
// Types : ayah (mots cliquables) | grammaire | racine

export const MONDES_B = [
  {
    id: 'w4',
    titre: 'Je comprends les phrases',
    sous: 'Versets mot à mot',
    icon: '🕋',
    lecons: [
      {
        id: 'a-fatiha2',
        titre: 'Al-Fâtiha, verset 2 — mot à mot',
        type: 'ayah',
        cartes: [
          { ar: 'الْحَمْدُ', fr: 'la louange', note: 'ال (le) + حَمْد (louange) : nom au nominatif (damma).' },
          { ar: 'لِلَّهِ', fr: 'à Allah', note: 'لِ (à) + الله ; la préposition لِ met ce qui suit à la kasra.' },
          { ar: 'رَبِّ', fr: 'Seigneur', note: 'kasra car relié à لِ : c’est le « génitif » (iʿrâb).' },
          { ar: 'الْعَالَمِينَ', fr: 'les mondes', note: 'pluriel masculin en ـِينَ, toujours en kasra/i.' },
        ],
      },
      {
        id: 'a-kawthar',
        titre: 'Al-Kawthar, verset 1 — mot à mot',
        type: 'ayah',
        cartes: [
          { ar: 'إِنَّآ', fr: 'en vérité, Nous', note: 'إِنَّ (en vérité) + آ (Nous) : إِنَّ ouvre une phrase nominale.' },
          { ar: 'أَعْطَيْنَٰكَ', fr: 'Nous t’avons donné', note: 'verbe au passé + نَا (Nous) + كَ (toi) : 3 éléments soudés !' },
          { ar: 'الْكَوْثَرَ', fr: 'l’Abondance', note: 'complément d’objet → finale en fatha (accusatif).' },
        ],
      },
      {
        id: 'a-ikhlas',
        titre: 'Al-Ikhlâs, versets 1-2 — mot à mot',
        type: 'ayah',
        cartes: [
          { ar: 'قُلْ', fr: 'dis !', note: 'impératif du verbe « dire » ; le soukoun final marque l’ordre.' },
          { ar: 'هُوَ', fr: 'Il est', note: 'pronom « lui », sujet de la phrase.' },
          { ar: 'اللَّهُ', fr: 'Allah', note: 'sujet au nominatif (damma).' },
          { ar: 'أَحَدٌ', fr: 'Unique', note: 'attribut au nominatif avec tanwin : « aḥadoun ».' },
          { ar: 'الصَّمَدُ', fr: 'l’Absolu', note: 'ال + صمد : « Celui dont tout dépend ».' },
        ],
      },
      {
        id: 'a-falaq',
        titre: 'Al-Falaq, verset 1 — mot à mot',
        type: 'ayah',
        cartes: [
          { ar: 'قُلْ', fr: 'dis !', note: 'impératif : ordre direct.' },
          { ar: 'أَعُوذُ', fr: 'je cherche refuge', note: 'verbe au présent : أ (je) + عوذ.' },
          { ar: 'بِرَبِّ', fr: 'auprès du Seigneur', note: 'بِ (auprès de) + رَبّ à la kasra après préposition.' },
          { ar: 'الْفَلَقِ', fr: 'l’aube', note: 'complément de رَبِّ → génitif en kasra.' },
        ],
      },
    ],
  },
  {
    id: 'w5',
    titre: 'Je comprends la grammaire',
    sous: 'Débloquée pas à pas',
    icon: '🧩',
    lecons: [
      {
        id: 'g-genre',
        titre: 'Débutant — Masculin / féminin',
        type: 'grammaire',
        cartes: [
          { regle: 'Le féminin se termine souvent par ـَة (ta marbuta).', ex: [{ ar: 'مُؤْمِنٌ / مُؤْمِنَةٌ', fr: 'croyant / croyante' }, { ar: 'جَنَّةٌ', fr: 'jardin (fém.)' }] },
          { regle: 'Pluriel masculin « sain » : ـُونَ (nominatif) / ـِينَ (génitif-accusatif).', ex: [{ ar: 'مُؤْمِنُونَ / مُؤْمِنِينَ', fr: 'les croyants' }] },
          { regle: 'Pluriel féminin : ـَاتٌ.', ex: [{ ar: 'حَسَنَاتٍ', fr: 'de bonnes actions' }] },
        ],
        exos: [
          { q: 'Quel mot est féminin ?', choix: ['مُؤْمِنَةٌ', 'مُؤْمِنٌ', 'رَبٌّ', 'يَوْمٌ'], bonne: 0 },
          { q: 'ـِينَ marque :', choix: ['le féminin', 'le pluriel masculin', 'le duel', 'le singulier'], bonne: 1 },
        ],
      },
      {
        id: 'g-pronoms',
        titre: 'Débutant — Les pronoms',
        type: 'grammaire',
        cartes: [
          { regle: 'أَنَا je · أَنْتَ tu (m.) · أَنْتِ tu (f.)', ex: [{ ar: 'أَنَا', fr: 'je' }] },
          { regle: 'هُوَ il · هِيَ elle · نَحْنُ nous', ex: [{ ar: 'هُوَ اللَّهُ', fr: 'Il est Allah' }] },
          { regle: 'أَنْتُمْ vous · هُمْ ils (elles : هُنَّ)', ex: [{ ar: 'هُمْ عَن صَلَاتِهِمْ', fr: 'eux, de leur prière' }] },
        ],
        exos: [
          { q: '« elle » se dit :', choix: ['هُوَ', 'هِيَ', 'نَحْنُ', 'أَنْتَ'], bonne: 1 },
          { q: 'هُمْ signifie :', choix: ['vous', 'ils', 'nous', 'tu (f.)'], bonne: 1 },
        ],
      },
      {
        id: 'g-prep',
        titre: 'Débutant — Prépositions & démonstratifs',
        type: 'grammaire',
        cartes: [
          { regle: 'فِي dans · مِن de · إِلَى vers · عَلَى sur · بِ avec/par · لِ pour/à · عَن au sujet de.', ex: [{ ar: 'فِي صُدُورِ', fr: 'dans les poitrines' }] },
          { regle: 'Après une préposition, le nom prend la KASRA (génitif).', ex: [{ ar: 'بِرَبِّ', fr: 'par le Seigneur' }] },
          { regle: 'هَٰذَا ceci (m.) · هَٰذِهِ ceci (f.).', ex: [{ ar: 'هَٰذَا', fr: 'ce / ceci' }] },
        ],
        exos: [
          { q: '« vers » se dit :', choix: ['فِي', 'إِلَى', 'عَلَى', 'مِن'], bonne: 1 },
          { q: 'Après بِ, le nom se termine par :', choix: ['fatha', 'damma', 'kasra', 'soukoun'], bonne: 2 },
        ],
      },
      {
        id: 'g-verbe',
        titre: 'Intermédiaire — Verbe passé & présent',
        type: 'grammaire',
        cartes: [
          { regle: 'Passé (mâdi) : كَتَبَ il a écrit · كَتَبَتْ elle · كَتَبُوا ils.', ex: [{ ar: 'كَتَبَ', fr: 'il a écrit' }] },
          { regle: 'Présent (muḍâriʿ) : يَكْتُبُ il écrit · تَكْتُبُ elle · أَكْتُبُ je.', ex: [{ ar: 'يَكْتُبُ', fr: 'il écrit' }] },
          { regle: 'La racine ك-ت-ب porte le sens d’« écrire » dans toutes ces formes.', ex: [{ ar: 'كِتَابٌ', fr: 'livre' }] },
        ],
        exos: [
          { q: 'كَتَبُوا signifie :', choix: ['il a écrit', 'ils ont écrit', 'elle a écrit', 'j’ai écrit'], bonne: 1 },
          { q: '« il écrit » (présent) = ', choix: ['كَتَبَ', 'يَكْتُبُ', 'اكْتُبْ', 'كِتَابٌ'], bonne: 1 },
        ],
      },
    ],
  },
  {
    id: 'w6',
    titre: 'Je comprends les versets',
    sous: 'Pourquoi chaque mot est là',
    icon: '🔍',
    lecons: [
      {
        id: 'v-kasra',
        titre: 'Pourquoi tant de kasras ?',
        type: 'grammaire',
        cartes: [
          { regle: 'Après les prépositions (بِ، لِ، مِن…) le nom est au génitif : finale -i.', ex: [{ ar: 'بِرَبِّ', fr: 'auprès du Seigneur' }, { ar: 'مِن شَرِّ', fr: 'du mal' }] },
          { regle: 'Dans l’annexion (mot + mot liés), le 1er prend aussi la kasra : رَبِّ الْعَالَمِينَ.', ex: [{ ar: 'رَبِّ', fr: 'Seigneur de…' }] },
          { regle: 'Le pluriel ـِينَ garde toujours le son « îna ».', ex: [{ ar: 'الْعَالَمِينَ', fr: 'les mondes' }] },
        ],
        exos: [
          { q: 'Dans بِسْمِ اللَّهِ, pourquoi « mi » et « llâhi » ?', choix: ['fatha partout', 'kasra après بِ + annexion', 'tanwin', 'soukoun'], bonne: 1 },
          { q: 'مَلِكِ النَّاسِ : مَلِكِ finit en -i car…', choix: ['c’est un verbe', 'il est annexé à النَّاسِ', 'il est féminin', 'il est au duel'], bonne: 1 },
        ],
      },
      {
        id: 'v-finales',
        titre: 'Les finales -un, -an, -ouna',
        type: 'grammaire',
        cartes: [
          { regle: '-oun (damma+tanwin) : sujet. -in (kasra+tanwin) : génitif. -an (fatha+tanwin) : objet.', ex: [{ ar: 'أَحَدٌ', fr: 'Unique (attribut → -oun)' }] },
          { regle: 'Comparer : مُؤْمِنُونَ (sujet) / مُؤْمِنِينَ (après préposition).', ex: [{ ar: 'لِلْمُؤْمِنِينَ', fr: 'pour les croyants' }] },
        ],
        exos: [
          { q: 'Un nom SUJET se termine souvent par :', choix: ['-oun', '-in', '-an', '-î'], bonne: 0 },
          { q: 'شَكُورًا (objet) se termine par :', choix: ['damma', 'kasra', 'fatha+tanwin', 'soukoun'], bonne: 2 },
        ],
      },
    ],
  },
  {
    id: 'w7',
    titre: 'J’analyse le Coran',
    sous: 'Le système des racines',
    icon: '🌳',
    lecons: [
      {
        id: 'r-ktb',
        titre: 'Racine ك ت ب — écrire',
        type: 'racine',
        cartes: [
          { ar: 'كِتَابٌ', fr: 'livre' },
          { ar: 'كَتَبَ', fr: 'il a écrit' },
          { ar: 'يَكْتُبُ', fr: 'il écrit' },
          { ar: 'مَكْتُوبٌ', fr: 'écrit / destiné' },
          { ar: 'كَاتِبٌ', fr: 'scribe' },
        ],
        explication: 'Trois consonnes ك-ت-ب portent l’idée d’écrire ; les voyelles autour fabriquent les mots.',
        exos: [
          { q: 'Quel mot NE vient PAS de ك ت ب ?', choix: ['كِتَابٌ', 'مَكْتُوبٌ', 'قَلْبٌ', 'كَاتِبٌ'], bonne: 2 },
        ],
      },
      {
        id: 'r-rhm',
        titre: 'Racine ر ح م — miséricorde',
        type: 'racine',
        cartes: [
          { ar: 'رَحْمَةٌ', fr: 'miséricorde' },
          { ar: 'رَحْمَٰنُ', fr: 'Tout-Miséricordieux (intensif)' },
          { ar: 'رَحِيمٌ', fr: 'Très-Miséricordieux' },
          { ar: 'رَحِمٌ', fr: 'lien de parenté' },
        ],
        explication: 'رَحْمَٰن décrit une miséricorde immense (réservé à Allah) ; رَحِيم sa constance.',
        exos: [
          { q: 'Quel mot NE vient PAS de ر ح م ?', choix: ['رَحِيمٌ', 'رَحْمَةٌ', 'يَوْمٌ', 'رَحْمَٰنُ'], bonne: 2 },
        ],
      },
      {
        id: 'r-ilm',
        titre: 'Racine ع ل م — savoir',
        type: 'racine',
        cartes: [
          { ar: 'عِلْمٌ', fr: 'science' },
          { ar: 'عَالِمٌ', fr: 'savant' },
          { ar: 'عَلِيمٌ', fr: 'Omniscient' },
          { ar: 'يَعْلَمُ', fr: 'il sait' },
          { ar: 'مَعْلُومٌ', fr: 'connu' },
        ],
        explication: 'Du même tronc : le savoir (ʿilm), celui qui sait (ʿâlim), Celui qui sait tout (ʿAlîm).',
        exos: [
          { q: '« Omniscient » = ', choix: ['عَالِمٌ', 'عَلِيمٌ', 'عِلْمٌ', 'مُعَلِّمٌ'], bonne: 1 },
          { q: 'Quel mot NE vient PAS de ع ل م ?', choix: ['يَعْلَمُ', 'عَالَمِينَ', 'مَعْلُومٌ', 'عِلْمٌ'], bonne: 1 },
        ],
      },
    ],
  },
];
