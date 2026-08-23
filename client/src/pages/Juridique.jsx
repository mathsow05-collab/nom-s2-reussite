import { useState } from 'react';
import Icon from '../Icon.jsx';

/* ------------------------------------------------------------------ */
/* Documents légaux — conformité loi n° 2008-12 du 25 janvier 2008     */
/* (protection des données personnelles au Sénégal, CDP).              */
/* Les éléments entre [crochets] sont à compléter par l'éditeur.       */
/* ------------------------------------------------------------------ */

const EDITEUR = {
  nom: 'SCHOOBY (S2 Réussite)',
  forme: '[Forme juridique — ex. SUARL]',
  adresse: '[Adresse du siège — Dakar, Sénégal]',
  rccm: '[N° RCCM — ex. SN.DKR.2026.B.1234]',
  ninea: '[N° NINEA]',
  contact: '[Email de contact — ex. contact@schooby.sn]',
  directeur: '[Nom du directeur de la publication]',
  hebergeur: 'Render, Inc. (infrastructure cloud — région Francfort)',
  cdp: '[N° de récépissé de déclaration CDP — cdp.sn]',
};

function Bloc({ t, children }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{t}</h3>
      <div className="muted small" style={{ lineHeight: 1.6 }}>
        {children}
      </div>
    </section>
  );
}

function Mentions() {
  return (
    <>
      <Bloc t="Éditeur du site">
        {EDITEUR.nom} — {EDITEUR.forme}, au capital social déclaré, siège : {EDITEUR.adresse}. RCCM : {EDITEUR.rccm} · NINEA : {EDITEUR.ninea}. Directeur de la publication : {EDITEUR.directeur}. Contact : {EDITEUR.contact}.
      </Bloc>
      <Bloc t="Hébergement">
        {EDITEUR.hebergeur}. Les données pédagogiques sont exploitées par l'éditeur ; l'hébergeur n'y accède que pour l'exécution technique du service.
      </Bloc>
      <Bloc t="Protection des données personnelles">
        Le traitement des données personnelles mis en œuvre sur la plateforme a fait l'objet d'une déclaration auprès de la Commission de protection des Données Personnelles (CDP) conformément à la loi n° 2008-12 du 25 janvier 2008. Récépissé : {EDITEUR.cdp}. Toute personne concernée dispose d'un droit d'accès, de rectification et de suppression (art. 58 et suivants de la loi) en écrivant à {EDITEUR.contact}, ou d'un droit de plainte auprès de la CDP (www.cdp.sn).
      </Bloc>
      <Bloc t="Propriété intellectuelle">
        L'ensemble des contenus (cours, fiches, quiz, illustrations, marque) est la propriété de l'éditeur ou fait l'objet d'une licence d'usage. Toute reproduction non autorisée est interdite.
      </Bloc>
    </>
  );
}

function Confidentialite() {
  return (
    <>
      <Bloc t="1. Responsable du traitement">
        {EDITEUR.nom}, {EDITEUR.adresse}, représentée par {EDITEUR.directeur}.
      </Bloc>
      <Bloc t="2. Données collectées">
        Identité de l'élève (prénom, nom, classe, filière), identifiant de connexion généré par l'administration, avatar choisi, progression pédagogique (cours ouverts, scores de quiz, temps d'étude, rangs), messages des espaces d'échange entre élèves, documents déposés dans le cadre des devoirs binômes. Aucune donnée bancaire n'est collectée par la plateforme.
      </Bloc>
      <Bloc t="3. Finalités">
        Gestion du parcours pédagogique, suivi par l'équipe éducative, communication interne à la plateforme, sécurité des sessions. Aucune finalité publicitaire, aucune vente ni location de données à des tiers.
      </Bloc>
      <Bloc t="4. Base juridique et consentement">
        Exécution du contrat de service éducatif et consentement de l'élève majeur ou du titulaire de l'autorité parentale pour les mineurs, recueilli lors de la première connexion (loi n° 2008-12, art. 4 et 6).
      </Bloc>
      <Bloc t="5. Durées de conservation">
        Données de scolarité : durée de l'inscription augmentée de trois (3) ans ; journaux de sécurité : un (1) an ; messages entre élèves : durée de l'inscription.
      </Bloc>
      <Bloc t="6. Destinataires">
        L'équipe administrative habilitée de l'établissement (chacun dans la limite de sa filière), et l'élève lui-même. Aucun transfert à des tiers hors hébergeur technique.
      </Bloc>
      <Bloc t="7. Sécurité">
        Sessions uniques révocables, mots de passe administrateurs hachés (scrypt), signatures de session à durée limitée, chiffrement HTTPS, en-têtes de sécurité renforcés, limitation de débit anti-abus. Toute violation de données serait notifiée à la CDP et aux personnes concernées conformément à la loi.
      </Bloc>
      <Bloc t="8. Vos droits">
        Accès, rectification, suppression, opposition (art. 58 à 66 de la loi n° 2008-12) : {EDITEUR.contact}. Réponse sous trente (30) jours. Recours : plainte auprès de la CDP, www.cdp.sn.
      </Bloc>
    </>
  );
}

function Cgu() {
  return (
    <>
      <Bloc t="1. Objet">
        Les présentes Conditions Générales d'Utilisation encadrent l'accès à la plateforme éducative {EDITEUR.nom} : cours, quiz, examens chronométrés, assistant pédagogique, espaces d'échange et outils de suivi.
      </Bloc>
      <Bloc t="2. Compte élève">
        L'identifiant est délivré par l'administration. Il est strictement personnel. Une seule session active à la fois : toute connexion sur un nouvel appareil déconnecte le précédent. Le partage d'identifiant peut entraîner la suspension du compte.
      </Bloc>
      <Bloc t="3. Comportement attendu">
        Respect mutuel dans les échanges, absence de triche organisée (partage de réponses en examen), interdiction de toute tentative d'intrusion ou de perturbation du service. Sanctions progressives : avertissement, suspension, révocation décidée par l'administration.
      </Bloc>
      <Bloc t="4. Mineurs">
        L'inscription d'un élève mineur suppose le consentement du titulaire de l'autorité parentale, recueilli par l'établissement lors de l'inscription et confirmé sur la plateforme à la première connexion.
      </Bloc>
      <Bloc t="5. Service et responsabilité">
        La plateforme est fournie « en l'état » avec une obligation de moyens. L'éditeur n'est pas responsable des interruptions du fait de l'hébergeur ou du réseau de l'utilisateur.
      </Bloc>
      <Bloc t="6. Données personnelles">
        Voir la Politique de confidentialité, qui fait partie intégrante des présentes.
      </Bloc>
      <Bloc t="7. Droit applicable">
        Droit sénégalais. À défaut d'accord amiable, compétence des tribunaux de Dakar.
      </Bloc>
    </>
  );
}

export default function Juridique({ avecBoutonFermer, onFermer }) {
  const [doc, setDoc] = useState('cgu');
  return (
    <div>
      <div className="pills" style={{ marginBottom: 12 }}>
        <button className={doc === 'cgu' ? 'pill active' : 'pill'} onClick={() => setDoc('cgu')}>
          Conditions d'utilisation
        </button>
        <button className={doc === 'conf' ? 'pill active' : 'pill'} onClick={() => setDoc('conf')}>
          Confidentialité
        </button>
        <button className={doc === 'mentions' ? 'pill active' : 'pill'} onClick={() => setDoc('mentions')}>
          Mentions légales
        </button>
        {avecBoutonFermer && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onFermer}>
            <Icon name="x" size={15} /> Fermer
          </button>
        )}
      </div>
      {doc === 'cgu' && <Cgu />}
      {doc === 'conf' && <Confidentialite />}
      {doc === 'mentions' && <Mentions />}
    </div>
  );
}
