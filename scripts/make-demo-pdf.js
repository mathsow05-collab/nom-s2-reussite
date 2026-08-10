// Régénère les PDF de démonstration dans uploads/ (le serveur le fait aussi
// automatiquement au tout premier lancement d'une base vierge).
//   npm run seed:pdfs
const { UPLOADS_DIR } = require('../server/paths');
const { writeDemoPdfs } = require('../server/demo-pdf');

const written = writeDemoPdfs(UPLOADS_DIR, { force: true });
if (written.length) {
  console.log(`✔ ${written.length} PDF régénérés :`);
  for (const f of written) console.log('  ' + f);
} else {
  console.log('Rien à faire.');
}
